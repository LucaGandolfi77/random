#!/usr/bin/env bash
set -e

# Install pnpm globally
npm i -g pnpm

# Install frontend dependencies
cd frontend
pnpm install

echo "Frontend dependencies installed."