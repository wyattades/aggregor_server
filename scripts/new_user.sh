#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"username": "spenserw", "password": "123456", "first_name": "Spenser", "last_name": "Williams"}' \
     localhost:3000/user/new
