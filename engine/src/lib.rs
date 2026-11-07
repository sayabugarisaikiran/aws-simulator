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
pub fn validate(nodes: &[Value]) -> Vec<String> {
    let mut errors = Vec::new();
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
        if kind(n, "acl") {
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
    let mut trace = Trace {
        nodes,
        steps: vec![],
    };
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
    let errors = validate(&selected);
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
    if !kind(target, "igw") || target["attached"] != true {
        trace.push(
            text(target, "id"),
            "Internet gateway unavailable",
            "Attach an internet gateway and route to it.".into(),
            false,
        );
        return trace.steps;
    }
    if nat_sub.is_none() && sub["publicIp"] != true {
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
pub fn handle(request: &Value) -> Value {
    let nodes = request["nodes"].as_array().cloned().unwrap_or_default();
    match text(request, "action") {
        "validate" => json!(validate(&nodes)),
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
