if [ -f dist/server/server.js ]; then node dist/server/server.js --config `dv get config`; else echo No file; fi;
