use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct AuthConfig {
    issuer: String,
    audience: String,
    jwks_url: String,
    allowed_paths: Vec<String>,
}

#[derive(Clone, Default)]
struct AppState {
    config: Arc<RwLock<AuthConfig>>,
}

#[derive(Debug, Deserialize)]
struct CheckRequest {
    headers: HashMap<String, String>,
    path: String,
    method: String,
}

#[derive(Debug, Serialize)]
struct CheckResponse {
    allowed: bool,
    principal: Option<String>,
    reason: Option<String>,
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/check", post(check))
        .route("/config", post(update_config))
        .with_state(AppState::default());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:7001").await.unwrap();
    println!("authn-sidecar: listening on 127.0.0.1:7001");
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> &'static str {
    "ok"
}

async fn check(State(state): State<AppState>, Json(req): Json<CheckRequest>) -> (StatusCode, Json<CheckResponse>) {
    let cfg = state.config.read().await.clone();

    if cfg.allowed_paths.iter().any(|prefix| req.path.starts_with(prefix)) {
        return (
            StatusCode::OK,
            Json(CheckResponse {
                allowed: true,
                principal: Some("anonymous".into()),
                reason: None,
            }),
        );
    }

    let auth = req.headers.get("authorization").cloned().unwrap_or_default();
    if !auth.starts_with("Bearer ") {
        return (
            StatusCode::UNAUTHORIZED,
            Json(CheckResponse {
                allowed: false,
                principal: None,
                reason: Some("missing bearer token".into()),
            }),
        );
    }

    let token = auth.trim_start_matches("Bearer ").trim();
    if token.is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(CheckResponse {
                allowed: false,
                principal: None,
                reason: Some("empty token".into()),
            }),
        );
    }

    let principal = format!("sub:{}:{}", req.method.to_lowercase(), req.path);
    (
        StatusCode::OK,
        Json(CheckResponse {
            allowed: true,
            principal: Some(principal),
            reason: None,
        }),
    )
}

async fn update_config(State(state): State<AppState>, Json(config): Json<AuthConfig>) -> StatusCode {
    let mut current = state.config.write().await;
    *current = config;
    StatusCode::NO_CONTENT
}
