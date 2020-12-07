#!/bin/bash

version=$(grep '"version":' manifest.json | cut -d: -f2 | cut -d\" -f2)

rm -rf *.tgz SHA256SUMS package lib
rm -rf ._*

mkdir package
cp *.py manifest.json LICENSE README.md package/
cp -r pkg css images js views package/

find package -type f -name '*.pyc' -delete
find package -type d -empty -delete

cd package
find . -type f \! -name SHA256SUMS -exec sha256sum {} \; >> SHA256SUMS
cd ..

tar czf "seashell-${version}.tgz" package
sha256sum "seashell-${version}.tgz"
