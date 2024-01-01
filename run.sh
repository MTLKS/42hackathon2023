# source run.sh

function init_nvm() {
  export NVM_DIR="$HOME/.nvm"

  echo "Initializing nvm" >&2
  if [ ! -d "$NVM_DIR" ]
  then
    << EOF cat >&2
NVM_DIR does not exist.
Please proceed with the installation guided at:
https://github.com/nvm-sh/nvm
EOF
    return 1
  fi
  # For disabling whatever error that comes from the script
  ZSH_DISABLE_COMPFIX=true
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
}

# Check if the current machine is a 42KL machine
if [ "$(uname -a | grep "42kl.edu.my")" ]
then
  database_path="database"

  echo "42KL machine detected, setting up local environment"
  [ -z "$NVM_DIR" ] && { init_nvm || return 1; }

  if [ ! "$(pgrep mongod)" ]
  then
    echo "Starting MongoDB" &&
    mongod --dbpath "$database_path" >> mongolog.json &
  fi
  echo "Setup completed" >&2
fi

source venv/bin/activate 2> /dev/null ||
source venv/Scripts/activate 2> /dev/null ||
echo "venv not found" >&2
export $(cat .env | xargs) &&
npm run start:dev
