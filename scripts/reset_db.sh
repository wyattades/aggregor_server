#!/bin/sh
sudo --user=postgres dropdb aggregor
sudo --user=postgres createdb aggregor -O aggregor
