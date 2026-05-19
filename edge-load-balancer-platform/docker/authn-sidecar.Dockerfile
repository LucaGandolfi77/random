FROM rust:1.87-slim AS builder
WORKDIR /src
COPY sidecars/authn-rust/Cargo.toml sidecars/authn-rust/Cargo.toml
COPY sidecars/authn-rust/src sidecars/authn-rust/src
RUN cargo build --manifest-path sidecars/authn-rust/Cargo.toml --release

FROM debian:bookworm-slim
RUN useradd --system --create-home --shell /usr/sbin/nologin appuser
WORKDIR /app
COPY --from=builder /src/sidecars/authn-rust/target/release/authn-sidecar /usr/local/bin/authn-sidecar
USER appuser
EXPOSE 7001
CMD ["authn-sidecar"]
