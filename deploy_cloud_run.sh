#!/usr/bin/env bash
set -e

SERVICE_NAME="cyber-nova-3d"
REGION="asia-northeast1"
PROJECT_ID="gen-lang-client-0290197999"

echo "=================================================="
echo " Deploying ${SERVICE_NAME} to Google Cloud Run"
echo " Project: ${PROJECT_ID}"
echo " Region:  ${REGION}"
echo "=================================================="

gcloud config set project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --quiet

echo "=================================================="
echo " Deployment Complete!"
echo " Service URL:"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)"
echo "=================================================="
