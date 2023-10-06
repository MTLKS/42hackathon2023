from datetime import datetime
import requests
import os
import json
import pandas as pd

"""
strptime(string, format) -> struct_time

Parse a string to a time tuple according to a format specification.
See the library reference manual for formatting codes (same as
strftime()).

Commonly used format codes:

%Y  Year with century as a decimal number.
%m  Month as a decimal number [01,12].
%d  Day of the month as a decimal number [01,31].
%H  Hour (24-hour clock) as a decimal number [00,23].
%M  Minute as a decimal number [00,59].
%S  Second as a decimal number [00,61].
%z  Time zone offset from UTC.
%a  Locale's abbreviated weekday name.
%A  Locale's full weekday name.
%b  Locale's abbreviated month name.
%B  Locale's full month name.
%c  Locale's appropriate date and time representation.
%I  Hour (12-hour clock) as a decimal number [01,12].
%p  Locale's equivalent of either AM or PM.

Other codes may be available on your platform.  See documentation for
the C library strftime function.
"""

# Enable ANSI coloring for Windows 
os.system('color 2> /dev/null')

ANSI_YELLOW = "\033[0;33m"
ANSI_MAGENTA = "\033[0;35m"
ANSI_RED = "\033[0;31m"
ANSI_UNDERSCORE = "\033[4;33m"
ANSI_RESET = "\033[0m"

HELP = f"""\
{ANSI_YELLOW}'exit' or EOF: exit the program{ANSI_RESET}
{ANSI_YELLOW}'fetch'      : fetch every 42kl users' data and update the user_42kl.json{ANSI_RESET}
{ANSI_YELLOW}'update'     : fetch every *latest batch pisciners' data and update the latest_batch.json{ANSI_RESET}
{ANSI_YELLOW}               *latest by the data in user_42kl.json{ANSI_RESET}
{ANSI_YELLOW}'get'        : get a user's data from given login and save it to a {{login}}.json, empty if not found{ANSI_RESET}
{ANSI_YELLOW}'filter'     : filter pisciners by project name and save it to a {{batch}} {{project_name}}.json{ANSI_RESET}
"""


# Your application uid and secret
# find them at https://profile.intra.42.fr/oauth/applications under 'YOUR APPLICATION'
# Should be environment variable in practice
def get_access_token():
    UID = "u-s4t2ud-b4184a135d11b1d706849be3b3682040de5fe771d42bdfe370c24fa9566d7d7a"
    SECRET = "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"

    # RESQUESTING ACCESS_TOKEN TO VALHALLA USING SECRETS
    headers = {'Content-type':'application/json'}
    r = requests.post(f"https://api.intra.42.fr/oauth/token?grant_type=client_credentials&client_id={UID}&client_secret={SECRET}", headers=headers)
    return r.json()['access_token']


# Gets all users that are linked to 42KL Campus
# 42KL Campus id number is '34' if you wish to change to your campus please change this number in 'url'
# Each call on api gives us a list of 100 users
# To get the next 100 users we change the page number
# The loop will loop till theres less than 100 users in a page
# That means we have reach the end.
def fetch_42kl_users(access_token: str):
    # 'i' represent the page
    # 'tol' represents the number of results in a page 100 by default
    # 'full_list' stores all the results of the users in a json array.
    i = 1
    tol = 100
    full_list = []
    while tol == 100:
        url = f"https://api.intra.42.fr/v2/campus/34/users?per_page=100&page={i}&access_token={access_token}"
        response = requests.get(url)
        full_list += response.json()
        tol = len(response.json())
        i += 1
    # output results to "user_42kl.json"
    with open("user_42kl.json","w") as f:
        f.write(json.dumps(full_list))


def get_user_data(access_token: str, login: str):
    response = requests.get(f'https://api.intra.42.fr/v2/users/{login}?access_token={access_token}')
    return response.json()


def user_get_batch(user) -> datetime:
    pool_year = user['pool_year']
    pool_month = user['pool_month']
    if pool_year == None or pool_month == None:
        return datetime.strptime("", "")
    else:
        return datetime.strptime(f"{pool_year}-{pool_month}", "%Y-%B")


def get_latest_batch():
    with open("user_42kl.json", "r") as f:
        users_42kl = json.loads(f.read())
    latest_batch = user_get_batch(max(users_42kl, key=user_get_batch))
    return filter(lambda user: user_get_batch(user) == latest_batch, users_42kl)


def get_user_sheet_data(cadet, current_time: datetime):
    user = {
        "intra_id": cadet['login'],
        "name": cadet["cursus_users"][1]["user"]["usual_full_name"].upper(),
        "period_from": datetime.strptime(cadet["cursus_users"][1]["begin_at"], "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d/%m/%Y"),
        "level": int(cadet["cursus_users"][1]["level"]),
    }
    # Example of adding new fields
    # user["YOUR CUSTOM FIELD NAME"] = cadet["JSON_FIELD(CHECK README BOTTOM)"]
    grade = cadet['cursus_users'][1]['grade']
    if grade == "Member":
        user["blackholed_date"] = current_time
    else:
        user["blackholed_date"] = datetime.strptime(cadet["cursus_users"][1]["blackholed_at"], "%Y-%m-%dT%H:%M:%S.%fZ")
    if (user["blackholed_date"] < current_time and grade != "Member"):
        user["blackholed_date"] = user["blackholed_date"].strftime("%d/%m/%Y")
        user["status"] = "DROPPED OUT"
    elif grade == "Member":
        user["blackholed_date"] = ""
        user["status"] = "SPECIALISATION"
    else:
        user["blackholed_at"] = ""
        user["status"] = "CORE PROG"
    return user


# Now that we have all of the cadets data that we need
# We loop through all the cadets to get the info that we need
# name = name of cadet, period_from = Cadets start date, level = Cadet level,
# status = 'DROPPED OUT', 'CORE PROG', 'SPECIALISATION', blackhole = Date of cadet being absorbed by blackhole
def generate_sheet():
    print(f"{ANSI_YELLOW}GENERATING EXCEL SHEET{ANSI_RESET}")
    with open("cadets.json", "r") as f:
        cadets = json.loads(f.read())
    current_time = datetime.now()
    data = [get_user_sheet_data(cadet, current_time) for cadet in cadets]
    df = pd.DataFrame.from_dict(data)
    print(df)
    df["period_from"] = pd.to_datetime(df["period_from"], format="%d/%m/%Y")
    df.sort_values(by=['period_from','name'], inplace=True)
    df["period_from"] = df["period_from"].dt.strftime('%d/%m/%Y')
    file_name = input(f"{ANSI_MAGENTA}Name Your Excel File: {ANSI_RESET}")
    df.to_excel(f"{file_name}.xlsx", index=False)
    print(f"\033[0;34m{file_name}.xlsx has been generated.{ANSI_RESET}")
    print(f"\033[0;34mExit the program and type 'open .' to view the folder and get the excel{ANSI_RESET}")
    print(f"\033[0;32mK Bye.{ANSI_RESET}")


def user_has_project(user, project_name: str):
    return project_name in [project['project']['name'] for project in user['projects_users']]


def filter_hasproject(users: list, project_name: str):
    """Tester utils"""

    has = []
    no = []
    for user in users:
        if user_has_project(user, project_name):
            has.append(user)
        else:
            no.append(user)
    return has, no


def test_filter_project(piciners: list, project_name: str):
    has_project, no_project = filter_hasproject(piciners, project_name)
    # json.dump(has_project, open(f'has_{project_name}.json', 'w'))
    # json.dump(no_project, open(f'no_{project_name}.json', 'w'))
    filter_project = list(filter(lambda user: user_has_project(user, project_name), piciners))
    if filter_project != has_project:
        print(f"{ANSI_RED}ERROR: filter_project != has_project{ANSI_RESET}")
        print(f"{ANSI_RED}filter_project: {len(filter_project)}{ANSI_RESET}")
        print(f"{ANSI_RED}has_project: {len(has_project)}{ANSI_RESET}")
        print(f"{ANSI_RED}filter_project: {[user['login'] for user in has_project]}{ANSI_RESET}")
        print(f"{ANSI_RED}has_project: {[user['login'] for user in filter_project]}{ANSI_RESET}")


def json_generator(access_token: str):
    try:
        ipt = input(f"{ANSI_MAGENTA}Command: {ANSI_RESET}")
    except EOFError:
        exit(0)
    except KeyboardInterrupt:
        print()
        return
    match ipt:
        case 'exit':
            exit(0)
        case 'all':
            # fetch update filter
            pass
        case 'fetch':
            fetch_42kl_users(access_token)
        case 'update':
            batch_logins = (user['login'] for user in get_latest_batch())
            batch = user_get_batch(next(get_latest_batch())).strftime('%Y-%m')
            user_data = [get_user_data(access_token, login) for login in batch_logins]
            json.dump(user_data, open('lastest_batch_data.json', 'w'))
        case 'get':
            login = input('login: ')
            json.dump(get_user_data(access_token, login), open(login + '.json', 'w'))
        case 'filter':
            project_name = 'C Piscine Rush 01'
            with open('lastest_batch_data.json', 'r') as f:
                piciners = json.load(f)
            batch = user_get_batch(piciners[0]).strftime('%Y-%m')
            project_subscriber = list(filter(lambda user: user_has_project(user, project_name), piciners))
            # Not checking for project status at the moment
            json.dump(project_subscriber, open(f'{batch} {project_name}.json', 'w'))
        case _:
            print(HELP, end='')


def main():
    print(HELP, end='')
    ACCESS_TOKEN = get_access_token()
    while True:
        try:
            json_generator(ACCESS_TOKEN)
            # generate_sheet()
        except KeyboardInterrupt:
            pass
        # except Exception as e:
        #     print('Error:', e)
        #     exit(1)


if __name__ == "__main__":
    main()

