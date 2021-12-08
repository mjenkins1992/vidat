#! /bin/bash

docker run -it --rm -d -p 8080:80 --name vidat -v ~/vidat/src/:/usr/share/nginx/html mjenkins1992/vidat:1.0


