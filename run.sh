# source run.sh
source venv/bin/activate
export $(cat .env | xargs) && npm run start:dev
