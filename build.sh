#!/bin/bash
set -e

echo "Installing root dependencies..."
npm install

echo "Building types package..."
npm run build --workspace=types

echo "Building API..."
npm run build --workspace=api

echo "Build complete!"
