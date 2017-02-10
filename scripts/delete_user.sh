#!/bin/bash
curl -X DELETE \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$1\", \"password\": \"$2\"}" \
     localhost:3000/user/delete
