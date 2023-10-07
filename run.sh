# source run.sh

export $(cat .env | xargs)
npm run start:dev
