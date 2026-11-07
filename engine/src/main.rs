use serde_json::{json, Value};
use std::io::{self, BufRead, Read};
fn main() {
    if std::env::args().any(|a| a == "--stdio") {
        for line in io::stdin().lock().lines() {
            let Ok(line) = line else { break };
            let result = serde_json::from_str::<Value>(&line)
                .map(|v| aws_simulator_engine::handle(&v))
                .unwrap_or(json!({"error":"Invalid JSON"}));
            println!("{result}");
        }
        return;
    }
    let server = tiny_http::Server::http("127.0.0.1:5180")
        .expect("Cannot bind Rust engine to 127.0.0.1:5180");
    println!("Rust engine listening on http://127.0.0.1:5180");
    for mut request in server.incoming_requests() {
        let mut body = String::new();
        let result = if request.url() == "/health" {
            json!({"engine":"rust","version":env!("CARGO_PKG_VERSION")})
        } else if request.method() == &tiny_http::Method::Post && request.url() == "/api/engine" {
            if request.body_length().unwrap_or(0) > 2_000_000 {
                json!({"error":"Workspace too large"})
            } else {
                let _ = request
                    .as_reader()
                    .take(2_000_001)
                    .read_to_string(&mut body);
                serde_json::from_str::<Value>(&body)
                    .map(|v| aws_simulator_engine::handle(&v))
                    .unwrap_or(json!({"error":"Invalid JSON"}))
            }
        } else {
            json!({"error":"Unknown endpoint"})
        };
        let status = if result.get("error").is_some() {
            400
        } else {
            200
        };
        let _ = request.respond(
            tiny_http::Response::from_string(result.to_string())
                .with_status_code(status)
                .with_header(
                    tiny_http::Header::from_bytes("Content-Type", "application/json").unwrap(),
                ),
        );
    }
}
