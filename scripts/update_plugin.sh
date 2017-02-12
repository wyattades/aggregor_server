#!/bin/bash
set -x
curl -X PUT \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d $5 \
     localhost:3000/user/$2/feed/$3/$4
