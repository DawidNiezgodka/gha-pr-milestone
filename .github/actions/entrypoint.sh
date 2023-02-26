#!/bin/bash

if [[ "$GITHUB_EVENT_NAME" != "pull_request" ]]; then
  echo "This action only runs on pull requests."
  echo "Found: $GITHUB_EVENT_NAME"
  exit 1
fi

ACTION=$(jq -r .action $GITHUB_EVENT_PATH)
if [[ "$ACTION" != "closed" ]]; then
  echo "This action only runs when a pull request is closed."
  echo "Found: $GITHUB_EVENT_NAME.$ACTION"
  exit 1
fi

MERGED=$(jq -r .pull_request.merged $GITHUB_EVENT_PATH)
if [[ "$MERGED" != "true" ]]; then
  echo "This action only runs when a pull request is merged."
  echo "Found: $GITHUB_EVENT_NAME.$ACTION.merged=$MERGED"
  exit 1
fi

