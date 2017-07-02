#!/bin/bash
curl -X DELETE \
     -H "X-Aggregor-Token: $1" \
     localhost:3000/user/$2/feed/$3/plugin/$4
