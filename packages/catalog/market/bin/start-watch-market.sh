if [ -f dist/server/server.js ] then nodemon -w dist/server dist/server/server.js -- --config `dv get config` else echo 'No file' fi
