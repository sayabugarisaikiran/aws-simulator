use serde_json::{json, Value};
use std::collections::HashSet;
fn text<'a>(v: &'a Value, k: &str) -> &'a str {
    v[k].as_str().unwrap_or("")
}
fn number(v: &Value) -> f64 {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
        .unwrap_or(f64::NAN)
}
fn list<'a>(v: &'a Value, k: &str) -> Vec<&'a Value> {
    v[k].as_array()
        .map(|a| a.iter().collect())
        .unwrap_or_default()
}
fn kind(v: &Value, k: &str) -> bool {
    text(v, "type") == k
}
fn find<'a>(nodes: &'a [Value], id: &str) -> Option<&'a Value> {
    nodes.iter().find(|n| text(n, "id") == id)
}
#[derive(Debug, PartialEq)]
pub struct Cidr {
    pub start: u64,
    pub end: u64,
    pub prefix: u32,
    pub canonical: bool,
}
pub fn cidr(s: &str) -> Option<Cidr> {
    let (ip, p) = s.split_once('/')?;
    let prefix: u32 = p.parse().ok()?;
    if prefix > 32 {
        return None;
    }
    let octets: Vec<_> = ip.split('.').collect();
    if octets.len() != 4 {
        return None;
    }
    let mut address = 0u64;
    for o in octets {
        if o.is_empty() || !o.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        let n: u64 = o.parse().ok()?;
        if n > 255 {
            return None;
        }
        address = address * 256 + n;
    }
    let size = 1u64 << (32 - prefix);
    let start = address / size * size;
    Some(Cidr {
        start,
        end: start + size - 1,
        prefix,
        canonical: address == start,
    })
}
pub fn contains(network: &str, ip: &str) -> bool {
    let ip = if ip.contains('/') {
        ip.to_string()
    } else {
        format!("{ip}/32")
    };
    match (cidr(network), cidr(&ip)) {
        (Some(a), Some(b)) => b.start >= a.start && b.end <= a.end,
        _ => false,
    }
}
fn identity_errors(nodes: &[Value]) -> Vec<String> {
    let mut errors = Vec::new();
    let mut ids = HashSet::new();
    for n in nodes {
        if !n.is_object() || text(n, "id").is_empty() || !ids.insert(text(n, "id")) {
            errors.push("Resource IDs must be nonempty and unique.".into());
        }
        if !["vpc", "subnet", "route", "igw", "nat", "eip", "acl"].contains(&text(n, "type")) {
            errors.push("Unsupported resource type.".into());
        }
        if kind(n, "subnet")
            && n.get("az")
                .is_some_and(|az| !matches!(az.as_str(), Some("" | "A" | "B")))
        {
            errors.push("Choose Availability Zone A or B for the subnet.".into());
        }
        for field in ["rules", "routes"] {
            if n.get(field).is_some_and(|v| !v.is_array()) {
                errors.push(format!("{} must be an array.", field));
            }
        }
    }
    if nodes.iter().filter(|n| kind(n, "vpc")).count() > 1 {
        errors.push("Only one VPC is supported in this workspace.".into());
    }
    errors
}
fn duplicate_routes(table: &Value) -> bool {
    let mut destinations = HashSet::new();
    list(table, "routes")
        .iter()
        .filter_map(|r| cidr(text(r, "cidr")))
        .any(|c| !destinations.insert((c.start, c.prefix)))
}
fn shared_nat_eip(nodes: &[Value], gateway: &Value) -> bool {
    let eip = text(gateway, "eip");
    !eip.is_empty()
        && nodes.iter().any(|other| {
            kind(other, "nat")
                && text(other, "id") != text(gateway, "id")
                && text(other, "eip") == eip
        })
}

pub fn validate(nodes: &[Value]) -> Vec<String> {
    validate_nodes(nodes, true)
}

fn validate_nodes(nodes: &[Value], check_all_nat: bool) -> Vec<String> {
    let mut errors = identity_errors(nodes);
    let Some(v) = nodes.iter().find(|n| kind(n, "vpc")) else {
        return vec!["Add a VPC to begin.".into()];
    };
    if !cidr(text(v, "cidr")).is_some_and(|c| c.canonical && (16..=28).contains(&c.prefix)) {
        errors.push("VPC needs a canonical IPv4 CIDR between /16 and /28.".into())
    }
    let subs: Vec<_> = nodes.iter().filter(|n| kind(n, "subnet")).collect();
    for (i, s) in subs.iter().enumerate() {
        let name = if text(s, "name").is_empty() {
            "Subnet"
        } else {
            text(s, "name")
        };
        let sc = cidr(text(s, "cidr"));
        if !sc
            .as_ref()
            .is_some_and(|c| c.canonical && (16..=28).contains(&c.prefix))
            || !contains(text(v, "cidr"), text(s, "cidr"))
        {
            errors.push(format!("{name} needs a /16–/28 CIDR inside the VPC."))
        }
        if subs[..i]
            .iter()
            .any(|t| match (&sc, cidr(text(t, "cidr"))) {
                (Some(a), Some(b)) => a.start <= b.end && b.start <= a.end,
                _ => false,
            })
        {
            errors.push(format!("{name} overlaps another subnet."))
        }
        if !find(nodes, text(s, "route")).is_some_and(|n| kind(n, "route")) {
            errors.push(format!("{name} needs a route table."))
        }
        if !text(s, "acl").is_empty()
            && !find(nodes, text(s, "acl")).is_some_and(|n| kind(n, "acl"))
        {
            errors.push(format!("{name} needs a Network ACL."))
        }
    }
    for n in nodes {
        if kind(n, "route") {
            if duplicate_routes(n) {
                errors.push(format!(
                    "{}: duplicate route destinations are not allowed.",
                    text(n, "name")
                ));
            }
            for r in list(n, "routes") {
                if !cidr(text(r, "cidr")).is_some_and(|c| c.canonical) {
                    errors.push(format!("{}: invalid route CIDR.", text(n, "name")))
                }
                if !find(nodes, text(r, "target")).is_some_and(|t| kind(t, "nat") || kind(t, "igw"))
                {
                    errors.push(format!(
                        "{}: choose an existing route target.",
                        text(n, "name")
                    ))
                }
            }
        }
        if kind(n, "nat") {
            if check_all_nat {
                let host = find(nodes, text(n, "subnet")).filter(|node| kind(node, "subnet"));
                if host.is_none() {
                    errors.push("Associate a public subnet with the NAT gateway.".into());
                } else if !host.is_some_and(|host| has_igw_route(nodes, subnet_table(nodes, host)))
                {
                    errors.push(
                        "The NAT gateway subnet needs a route to an internet gateway.".into(),
                    );
                }
                if !find(nodes, text(n, "eip")).is_some_and(|node| kind(node, "eip")) {
                    errors.push("Associate an Elastic IP with the NAT gateway.".into());
                }
            }
            for (field, expected) in [("subnet", "subnet"), ("eip", "eip")] {
                if !text(n, field).is_empty()
                    && find(nodes, text(n, field)).is_some_and(|target| !kind(target, expected))
                {
                    errors.push(format!(
                        "NAT {} must reference a {} resource.",
                        field, expected
                    ));
                }
            }
            if shared_nat_eip(nodes, n) {
                errors
                    .push("An Elastic IP cannot be shared by multiple public NAT gateways.".into());
            }
        }
        if kind(n, "acl") {
            for rule in list(n, "rules") {
                if !["in", "out"].contains(&text(rule, "direction"))
                    || !["allow", "deny"].contains(&text(rule, "action"))
                {
                    errors.push(format!(
                        "{}: invalid ACL direction or action.",
                        text(n, "name")
                    ));
                }
            }
            for d in ["in", "out"] {
                let mut nums = HashSet::new();
                for r in list(n, "rules")
                    .into_iter()
                    .filter(|r| text(r, "direction") == d)
                {
                    let num = number(&r["number"]);
                    let from = number(&r["from"]);
                    let to = number(&r["to"]);
                    if !num.is_finite()
                        || num.fract() != 0.
                        || !(1. ..=32766.).contains(&num)
                        || !nums.insert(num as u32)
                        || !cidr(text(r, "cidr")).is_some_and(|c| c.canonical)
                        || !from.is_finite()
                        || !to.is_finite()
                        || from.fract() != 0.
                        || to.fract() != 0.
                        || from < 0.
                        || to > 65535.
                        || from > to
                    {
                        errors.push(format!(
                            "{}: check {} rule numbers, CIDRs and ports.",
                            text(n, "name"),
                            if d == "in" { "inbound" } else { "outbound" }
                        ))
                    }
                }
            }
        }
    }
    let mut seen = HashSet::new();
    errors.retain(|e| seen.insert(e.clone()));
    errors
}
pub fn acl_check(acl: Option<&Value>, direction: &str, ip: &str, port: u32) -> (bool, String) {
    let Some(acl) = acl else {
        return (
            true,
            "Implicit default network ACL · ALLOW (no custom ACL associated)".into(),
        );
    };
    let mut rules = list(acl, "rules");
    rules.sort_by(|a, b| number(&a["number"]).total_cmp(&number(&b["number"])));
    if let Some(r) = rules.into_iter().find(|r| {
        text(r, "direction") == direction
            && contains(text(r, "cidr"), ip)
            && port as f64 >= number(&r["from"])
            && port as f64 <= number(&r["to"])
    }) {
        let action = text(r, "action");
        (
            action == "allow",
            format!(
                "Rule {} · {} TCP {port}",
                number(&r["number"]),
                action.to_uppercase()
            ),
        )
    } else {
        (false, format!("Default * rule · DENY TCP {port}"))
    }
}
struct Trace<'a> {
    nodes: &'a [Value],
    steps: Vec<Value>,
}
impl<'a> Trace<'a> {
    fn push(&mut self, id: &str, title: &str, detail: String, ok: bool) -> bool {
        self.steps
            .push(json!({"id":id,"title":title,"detail":detail,"ok":ok}));
        ok
    }
    fn check(&mut self, s: &Value, d: &str, ip: &str, port: u32, label: &str) -> bool {
        let acl = find(self.nodes, text(s, "acl"));
        let (ok, reason) = acl_check(acl, d, ip, port);
        self.push(
            acl.map(|a| text(a, "id")).unwrap_or(text(s, "id")),
            label,
            reason,
            ok,
        );
        self.steps.last_mut().unwrap()["subnetId"] = json!(text(s, "id"));
        ok
    }
    fn route(&mut self, s: &Value, ip: &str) -> Option<&'a Value> {
        let table = find(self.nodes, text(s, "route"));
        let mut routes = table.map(|t| list(t, "routes")).unwrap_or_default();
        routes.retain(|r| contains(text(r, "cidr"), ip));
        routes.sort_by_key(|r| {
            std::cmp::Reverse(cidr(text(r, "cidr")).map(|c| c.prefix).unwrap_or(0))
        });
        let r = routes.first();
        let target = r.and_then(|r| find(self.nodes, text(r, "target")));
        self.push(
            table.map(|t| text(t, "id")).unwrap_or(text(s, "id")),
            "Route lookup",
            r.map(|r| {
                format!(
                    "{} → {}",
                    text(r, "cidr"),
                    target.map(|n| text(n, "name")).unwrap_or("missing target")
                )
            })
            .unwrap_or("No route to destination".into()),
            r.is_some(),
        );
        target
    }
}
pub fn simulate(nodes: &[Value], subnet_id: &str, destination: &str, port: f64) -> Vec<Value> {
    simulate_probe(nodes, subnet_id, destination, port, false)
}

fn simulate_probe(
    nodes: &[Value],
    subnet_id: &str,
    destination: &str,
    port: f64,
    assume_public_ipv4: bool,
) -> Vec<Value> {
    let mut trace = Trace {
        nodes,
        steps: vec![],
    };
    if let Some(error) = identity_errors(nodes).first() {
        trace.push("", "Configuration incomplete", error.clone(), false);
        return trace.steps;
    }
    let mut relevant: HashSet<String> = nodes
        .iter()
        .filter(|n| kind(n, "vpc"))
        .map(|n| text(n, "id").into())
        .collect();
    let mut pending = vec![subnet_id.to_string()];
    while let Some(id) = pending.pop() {
        if id.is_empty() || !relevant.insert(id.clone()) {
            continue;
        }
        if let Some(n) = find(nodes, &id) {
            for k in ["route", "acl", "subnet", "eip"] {
                pending.push(text(n, k).into())
            }
            for r in list(n, "routes") {
                pending.push(text(r, "target").into())
            }
        }
    }
    let selected: Vec<_> = nodes
        .iter()
        .filter(|n| relevant.contains(text(n, "id")))
        .cloned()
        .collect();
    let errors = validate_nodes(&selected, false);
    if let Some(e) = errors.first() {
        trace.push("", "Configuration incomplete", e.clone(), false);
        return trace.steps;
    }
    if ["0.0.0.0", "255.255.255.255"].contains(&destination)
        || cidr(&format!("{destination}/32")).is_none()
        || !port.is_finite()
        || port.fract() != 0.
        || !(1. ..=65535.).contains(&port)
    {
        trace.push(
            "",
            "Invalid test",
            "Use an IPv4 destination and TCP port 1–65535.".into(),
            false,
        );
        return trace.steps;
    }
    let port = port as u32;
    let v = nodes.iter().find(|n| kind(n, "vpc")).unwrap();
    if contains(text(v, "cidr"), destination) {
        trace.push(
            "",
            "External test only",
            "Choose a destination outside the VPC for this preview.".into(),
            false,
        );
        return trace.steps;
    }
    let Some(sub) = find(nodes, subnet_id).filter(|n| kind(n, "subnet")) else {
        trace.push(
            "",
            "Choose a source subnet",
            "Add or select a subnet first.".into(),
            false,
        );
        return trace.steps;
    };
    trace.push(
        subnet_id,
        "Test endpoint",
        format!("{} → {destination}:{port} · TCP", text(sub, "name")),
        true,
    );
    if !trace.check(sub, "out", destination, port, "Source ACL · outbound") {
        return trace.steps;
    }
    let Some(mut target) = trace.route(sub, destination) else {
        return trace.steps;
    };
    let mut nat_sub = None;
    let source_ip =
        std::net::Ipv4Addr::from((cidr(text(sub, "cidr")).unwrap().start + 10) as u32).to_string();
    if kind(target, "nat") {
        if shared_nat_eip(nodes, target) {
            trace.push(
                text(target, "id"),
                "Elastic IP already associated",
                "Assign a unique Elastic IP to each public NAT gateway.".into(),
                false,
            );
            return trace.steps;
        }
        let s = find(nodes, text(target, "subnet")).filter(|n| kind(n, "subnet"));
        if s.is_none() || !find(nodes, text(target, "eip")).is_some_and(|n| kind(n, "eip")) {
            trace.push(
                text(target, "id"),
                "NAT gateway incomplete",
                "Associate a public subnet and an Elastic IP.".into(),
                false,
            );
            return trace.steps;
        }
        let s = s.unwrap();
        nat_sub = Some(s);
        if !trace.check(s, "in", &source_ip, port, "NAT subnet ACL · inbound") {
            return trace.steps;
        }
        trace.push(
            text(target, "id"),
            "Source address translated",
            "Zonal public NAT gateway uses the associated Elastic IP.".into(),
            true,
        );
        if !trace.check(s, "out", destination, port, "NAT subnet ACL · outbound") {
            return trace.steps;
        }
        let Some(t) = trace.route(s, destination) else {
            return trace.steps;
        };
        target = t;
    }
    if kind(target, "nat") {
        trace.push(text(target,"id"),"NAT routing cycle or unsupported NAT chain","The NAT subnet must route directly to an internet gateway; check for a NAT routing cycle.".into(),false);
        return trace.steps;
    }
    if !kind(target, "igw") || target["attached"] != true {
        trace.push(
            text(target, "id"),
            "Internet gateway unavailable",
            "Attach an internet gateway and route to it.".into(),
            false,
        );
        return trace.steps;
    }
    if nat_sub.is_none() && !assume_public_ipv4 && sub["publicIp"] != true {
        trace.push(
            subnet_id,
            "Public IPv4 needed",
            "Enable a public IPv4 on the test endpoint, or route through NAT.".into(),
            false,
        );
        return trace.steps;
    }
    trace.push(
        text(target, "id"),
        "Internet gateway",
        "Outbound request reaches the external test destination.".into(),
        true,
    );
    trace.push(
        "internet",
        "External destination",
        format!("{destination} returns a TCP response."),
        true,
    );
    if let Some(s) = nat_sub {
        if !trace.check(
            s,
            "in",
            destination,
            55000,
            "NAT subnet ACL · return inbound",
        ) {
            return trace.steps;
        }
        if !trace.check(
            s,
            "out",
            &source_ip,
            55000,
            "NAT subnet ACL · return outbound",
        ) {
            return trace.steps;
        }
    }
    if !trace.check(sub, "in", destination, 55000, "Source ACL · return inbound") {
        return trace.steps;
    }
    trace.push(
        subnet_id,
        "Round trip allowed",
        "Request and response passed the modelled network checks.".into(),
        true,
    );
    trace.steps
}
fn subnet_table<'a>(nodes: &'a [Value], subnet: &Value) -> Option<&'a Value> {
    find(nodes, text(subnet, "route")).filter(|node| kind(node, "route"))
}

fn has_igw_route(nodes: &[Value], table: Option<&Value>) -> bool {
    table.is_some_and(|table| {
        list(table, "routes").iter().any(|route| {
            cidr(text(route, "cidr")).is_some_and(|range| range.canonical)
                && find(nodes, text(route, "target")).is_some_and(|node| kind(node, "igw"))
        })
    })
}

enum InternetPath<'a> {
    Direct,
    Nat { gateway: &'a Value, host: &'a Value },
}

/// Route-only assessment deliberately excludes workload addressing and ACL policy.
fn internet_route<'a>(
    nodes: &'a [Value],
    subnet_id: &str,
    destination: &str,
) -> Result<InternetPath<'a>, String> {
    if let Some(error) = identity_errors(nodes).first() {
        return Err(error.clone());
    }
    let subnet = find(nodes, subnet_id)
        .filter(|s| kind(s, "subnet"))
        .ok_or("Select an existing subnet.")?;
    let vpc = nodes.iter().find(|n| kind(n, "vpc")).ok_or("Add a VPC.")?;
    if !cidr(text(vpc, "cidr")).is_some_and(|c| c.canonical && (16..=28).contains(&c.prefix))
        || !cidr(text(subnet, "cidr")).is_some_and(|c| c.canonical && (16..=28).contains(&c.prefix))
        || !contains(text(vpc, "cidr"), text(subnet, "cidr"))
    {
        return Err("Configure valid VPC and subnet CIDRs first.".into());
    }
    if cidr(&format!("{destination}/32")).is_none()
        || ["0.0.0.0", "255.255.255.255"].contains(&destination)
        || contains(text(vpc, "cidr"), destination)
    {
        return Err("Choose an external unicast IPv4 test destination.".into());
    }
    fn target<'a>(
        nodes: &'a [Value],
        subnet: &Value,
        destination: &str,
    ) -> Result<&'a Value, String> {
        let table = find(nodes, text(subnet, "route"))
            .filter(|t| kind(t, "route"))
            .ok_or("Associate a route table with the subnet.")?;
        if duplicate_routes(table) {
            return Err("Duplicate route destinations are not allowed.".into());
        }
        let mut matches = list(table, "routes");
        matches.retain(|r| contains(text(r, "cidr"), destination));
        matches.sort_by_key(|r| {
            std::cmp::Reverse(cidr(text(r, "cidr")).map(|c| c.prefix).unwrap_or(0))
        });
        let route = matches
            .first()
            .ok_or("No matching internet route in the subnet's route table.")?;
        find(nodes, text(route, "target"))
            .ok_or("The matching route references a missing gateway.".into())
    }
    let gateway = target(nodes, subnet, destination)?;
    let (igw, path) = if kind(gateway, "igw") {
        (gateway, InternetPath::Direct)
    } else if kind(gateway, "nat") {
        if shared_nat_eip(nodes, gateway) {
            return Err("Assign a unique Elastic IP to each public NAT gateway.".into());
        }
        let public = find(nodes, text(gateway, "subnet"))
            .filter(|s| kind(s, "subnet"))
            .ok_or("Associate the NAT gateway with a public subnet.")?;
        if !find(nodes, text(gateway, "eip")).is_some_and(|n| kind(n, "eip")) {
            return Err("NAT gateway needs an Elastic IP allocation.".into());
        }
        (
            target(nodes, public, destination)?,
            InternetPath::Nat {
                gateway,
                host: public,
            },
        )
    } else {
        return Err("The matching route target is not a supported gateway.".into());
    };
    if !kind(igw, "igw") {
        return Err("The NAT subnet needs a matching route directly to an internet gateway; cyclic NAT routes are not usable.".into());
    }
    if igw["attached"] != true {
        return Err("Attach the internet gateway to this VPC.".into());
    }
    Ok(path)
}
/// VPC-stage checks use explicit probe assumptions rather than editable workload data.
pub fn assess_subnet(nodes: &[Value], subnet_id: &str, destination: &str, port: f64) -> Value {
    let route = internet_route(nodes, subnet_id, destination);
    let subnet = find(nodes, subnet_id).filter(|node| kind(node, "subnet"));
    let table = subnet.and_then(|node| subnet_table(nodes, node));
    // Classification describes the associated table, not just the probe destination.
    let subnet_type = if has_igw_route(nodes, table) {
        "public"
    } else if table.is_some() {
        "private"
    } else {
        "unconfigured"
    };
    let (route_detail, assumption, nat_details) = match &route {
        Ok(InternetPath::Direct) => (
            "Direct route through internet gateway".into(),
            "Direct IPv4 internet access requires a public IPv4 on the workload. This probe assumes one.",
            Value::Null,
        ),
        Ok(InternetPath::Nat { gateway, host }) => {
            let source_az = subnet.map(|node| text(node, "az")).unwrap_or("");
            let nat_az = text(host, "az");
            let az_relation = if source_az.is_empty() || nat_az.is_empty() {
                "unknown"
            } else if source_az == nat_az {
                "same"
            } else {
                "different"
            };
            (
                "Outbound route through NAT and internet gateway".into(),
                "This probe uses the NAT gateway's Elastic IP. The source workload can use private IPv4.",
                json!({"id":text(gateway,"id"),"subnetId":text(host,"id"),"sourceAz":source_az,"natAz":nat_az,"azRelation":az_relation}),
            )
        }
        Err(reason) => (reason.clone(), "Configure a usable route to evaluate its addressing requirements.", Value::Null),
    };
    let mut steps = simulate_probe(nodes, subnet_id, destination, port, true);
    for step in &mut steps {
        if step["title"] == "Test endpoint" {
            step["title"] = json!("Subnet network probe");
            step["detail"] = json!(format!(
                "{destination}:{port} TCP · synthetic probe; workload configuration is excluded."
            ));
        }
        if step["title"] == "Round trip allowed" {
            step["title"] = json!("Subnet network checks passed");
            step["detail"] = json!(assumption);
        }
    }
    let allowed = steps
        .last()
        .is_some_and(|s| s["title"] == "Subnet network checks passed");
    json!({
        "subnetId": subnet_id,
        "subnetType": subnet_type,
        "routeTableId": table.map(|node| text(node, "id")),
        "routeReady": route.is_ok(),
        "routeDetail": route_detail,
        "requiresPublicIpv4": matches!(&route, Ok(InternetPath::Direct)),
        "nat": nat_details,
        "networkAllowed": allowed,
        "networkDetail": steps.last().map(|s| text(s, "detail")).unwrap_or("No test results"),
        "workloadStatus": "Not assessed — EC2 is not configured in this VPC builder.",
        "assumption": assumption,
        "steps": steps
    })
}
#[cfg(test)]
mod subnet_assessment_tests {
    use super::*;
    fn nodes() -> Vec<Value> {
        serde_json::from_value(json!([
 {"id":"v","type":"vpc","cidr":"10.0.0.0/16"},
 {"id":"s","type":"subnet","cidr":"10.0.1.0/24","route":"rt","publicIp":false},
 {"id":"rt","type":"route","routes":[{"cidr":"0.0.0.0/0","target":"igw"}]},
 {"id":"igw","type":"igw","attached":true}]))
        .unwrap()
    }
    #[test]
    fn network_check_needs_no_workload_checkbox() {
        let n = nodes();
        let r = assess_subnet(&n, "s", "8.8.8.8", 443.);
        assert_eq!(r["routeReady"], true);
        assert_eq!(r["networkAllowed"], true);
        assert_eq!(r["subnetType"], "public");
        assert_eq!(r["requiresPublicIpv4"], true);
        assert_eq!(r["routeTableId"], "rt");
        assert_eq!(n[1]["publicIp"], false);
        assert_eq!(
            simulate(&n, "s", "8.8.8.8", 443.).last().unwrap()["title"],
            "Public IPv4 needed"
        );
    }
    #[test]
    fn nat_assessment_reports_az_dependency_and_missing_allocation() {
        let mut n = nodes();
        n[1]["az"] = json!("A");
        n.extend([
            json!({"id":"private","type":"subnet","cidr":"10.0.2.0/24","route":"private-rt","az":"B"}),
            json!({"id":"private-rt","type":"route","routes":[{"cidr":"0.0.0.0/0","target":"nat"}]}),
            json!({"id":"nat","type":"nat","subnet":"s","eip":"eip"}),
            json!({"id":"eip","type":"eip"}),
        ]);
        let inspect = |nodes: &[Value]| assess_subnet(nodes, "private", "1.1.1.1", 443.);
        let report = inspect(&n);
        assert_eq!(report["subnetType"], "private");
        assert_eq!(report["networkAllowed"], true);
        assert_eq!(report["requiresPublicIpv4"], false);
        assert_eq!(report["nat"]["subnetId"], "s");
        assert_eq!(report["nat"]["azRelation"], "different");
        n[4]["az"] = json!("A");
        assert_eq!(inspect(&n)["nat"]["azRelation"], "same");
        n[4].as_object_mut().unwrap().remove("az");
        assert_eq!(inspect(&n)["nat"]["azRelation"], "unknown");
        n.pop();
        assert_eq!(inspect(&n)["networkAllowed"], false);
    }

    #[test]
    fn acl_failure_is_separate_from_route_readiness() {
        let mut n = nodes();
        n[1]["acl"] = json!("deny");
        n.push(json!({"id":"deny","type":"acl","rules":[]}));
        let r = assess_subnet(&n, "s", "8.8.8.8", 443.);
        assert_eq!(r["routeReady"], true);
        assert_eq!(r["networkAllowed"], false);
    }
    #[test]
    fn detached_gateway_is_not_a_configured_internet_path() {
        let mut n = nodes();
        n[3]["attached"] = json!(false);
        let r = assess_subnet(&n, "s", "8.8.8.8", 443.);
        assert_eq!(r["routeReady"], false);
        assert_eq!(r["networkAllowed"], false);
    }
    #[test]
    fn missing_route_and_internal_destination_are_not_internet_paths() {
        let mut n = nodes();
        n[2]["routes"] = json!([]);
        assert_eq!(assess_subnet(&n, "s", "8.8.8.8", 443.)["routeReady"], false);
        assert_eq!(
            assess_subnet(&nodes(), "s", "10.0.1.10", 443.)["networkAllowed"],
            false
        );
    }
}

pub fn handle(request: &Value) -> Value {
    let nodes = request["nodes"].as_array().cloned().unwrap_or_default();
    match text(request, "action") {
        "validate" => json!(validate(&nodes)),
        "assess_all" => {
            let destination = if text(request, "destination").is_empty() {
                "1.1.1.1"
            } else {
                text(request, "destination")
            };
            let port = if request.get("port").is_none() {
                443.
            } else {
                number(&request["port"])
            };
            json!(nodes
                .iter()
                .filter(|n| kind(n, "subnet"))
                .map(|n| {
                    let mut report = assess_subnet(&nodes, text(n, "id"), destination, port);
                    report.as_object_mut().unwrap().remove("steps");
                    report
                })
                .collect::<Vec<_>>())
        }
        "assess" => json!([assess_subnet(
            &nodes,
            text(request, "subnetId"),
            text(request, "destination"),
            number(&request["port"])
        )]),
        "simulate" => json!(simulate(
            &nodes,
            text(request, "subnetId"),
            text(request, "destination"),
            number(&request["port"])
        )),
        _ => json!({"error":"Unknown engine action"}),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn addresses() {
        assert!(cidr("300.1.1.1/24").is_none());
        assert!(!cidr("10.0.1.1/24").unwrap().canonical);
        assert!(contains("10.0.0.0/16", "10.0.1.0/24"));
        assert_eq!(cidr("0.0.0.0/0").unwrap().end, 4294967295)
    }
    #[test]
    fn stateless_rules() {
        let acl = json!({"rules":[{"number":100,"direction":"out","cidr":"0.0.0.0/0","from":443,"to":443,"action":"allow"},{"number":50,"direction":"out","cidr":"1.1.1.1/32","from":443,"to":443,"action":"deny"}]});
        assert!(!acl_check(Some(&acl), "out", "1.1.1.1", 443).0);
        assert!(acl_check(Some(&acl), "out", "8.8.8.8", 443).0);
        assert!(!acl_check(Some(&acl), "in", "8.8.8.8", 55000).0);
        assert!(acl_check(None, "in", "8.8.8.8", 55000).0)
    }
}
