#!/bin/bash

psql -f 'config/seeds.sql' postgresql://localhost:5432/aggregor?user=aggregor&password=aggregor

echo 'Done.'
