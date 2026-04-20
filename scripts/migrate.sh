#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env file in project root: ${ENV_FILE}"
  exit 1
fi

SUPABASE_URL="$(grep -E '^VITE_SUPABASE_URL=' "${ENV_FILE}" | head -n1 | cut -d'=' -f2- | tr -d '[:space:]')"

if [[ -z "${SUPABASE_URL}" ]]; then
  echo "VITE_SUPABASE_URL is missing in .env"
  exit 1
fi

PROJECT_REF="$(echo "${SUPABASE_URL}" | sed -E 's#^https://([a-z0-9]{20})\.supabase\.co/?$#\1#')"

if [[ ! "${PROJECT_REF}" =~ ^[a-z0-9]{20}$ ]]; then
  echo "Invalid project ref extracted from VITE_SUPABASE_URL: ${SUPABASE_URL}"
  echo "Expected format: https://abcdefghijklmnopqrst.supabase.co"
  exit 1
fi

echo "Using Supabase project ref: ${PROJECT_REF}"

cd "${ROOT_DIR}"
supabase link --project-ref "${PROJECT_REF}"
supabase db push
