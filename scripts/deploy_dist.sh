#!/bin/bash
#
# Deploys the current iTowns dist to the gh-pages branch of the GitHub
# repository.

set -ex

REPO_ROOT=$(dirname $(realpath $(dirname ${BASH_SOURCE[0]})))

DIR=temp-itowns-clone

# Delete any existing temporary gh-pages clone
rm -rf $DIR

# Clone the current repo into temp folder
git clone -b gh-pages $REPO_ROOT $DIR

# Move working directory into temp folder
cd $DIR

# Delete everything
rm -rf ./dist/*

# Copy website files from real repo
cp -R ../dist/* ./dist/

# Stage all files in git and create a commit
git add ./dist/
git add -u
git commit -m "iTowns at $(date)"

# Push the new files up to GitHub
git push https://github.com/iTowns/itowns.git gh-pages

# Delete our temp folder
cd ..
rm -rf $DIR
