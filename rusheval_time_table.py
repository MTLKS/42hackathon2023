import numpy as np
import sys
import json
from matplotlib import pyplot as plt
from matplotlib import colors as pltcolor
from matplotlib import table as plttable
from itertools import zip_longest


def create_figure():
    plt.figure(
        facecolor=(.831, .831, .831),
        edgecolor=(.39, .39, .39),
        tight_layout={'pad':1},
        dpi=200,
        figsize=(8, 4)
    )
    plt.gca().get_xaxis().set_visible(False)
    plt.gca().get_yaxis().set_visible(False)
    plt.box(on=None)
    plt.suptitle("Evaluation Time Table")


def get_data_map(sessions: list) -> dict[str, list[str]]:
    data = {time: [] for time in ('10:00AM', '11:00AM', '2:00PM', '3:00PM', '4:00PM', '5:00PM')}
    for session in sessions:
        team = f"$\\bf Team: {session['leader']}$"
        cadet = f"$\\bf Cadet:$ {session['evaluator']}"
        data[session['time']].append(f"{team}\n{cadet}")
    return data


def set_cells_colors(table: plttable.Table):
    purple_blue = lambda x: ["#dad1e9", "#c8daf8"][x == -1 or x % 2 == 0]
    yellow_white = lambda x: ["#fff2cc", "#ffffff"][x == -1 or x % 2 == 0]
    for pos, cell in table.get_celld().items():
        y, x = pos
        if y % 2 == 0:
            facecolor = purple_blue(x)
        else:
            facecolor = yellow_white(x + ((y + 1) / 4).is_integer())
        # transparentize empty slot
        if cell.get_text().get_text() == '':
            facecolor += "50"
            cell.set_edgecolor("#393939")
        cell.set_facecolor(pltcolor.to_rgba(facecolor))


def set_fonts(table: plttable.Table):
    table.auto_set_font_size(False)
    for cell in table.get_celld().values():
        cell.set_width(.2)
        cell.set_height(cell.get_height() * 2.5)


def draw_session(sessions: list):
    create_figure()
    data = get_data_map(sessions)
    # np.array require the size to be homogeneous
    print(data)
    lst = np.array([value for value in zip_longest(*data.values(), fillvalue='')])
    # Construct a new array, since transpose return only a view but resize require the object ownership
    lst = np.array(lst.transpose())
    lst.resize((6, 4))
    print(lst)
    table = plt.table(
            rowLabels=list(data.keys()),
            rowLoc='center',
            cellLoc='center',
            loc='center',
            cellText=lst,
        )
    set_cells_colors(table)
    set_fonts(table)


def get_session(filename: str):
    get_login = lambda user: user['intraName']
    def get_eval_data(team):
        return {
            'leader': get_login(team['teamLeader']),
            'evaluator': get_login(team['evaluator']),
            'time': team['timeslot']['timeslot']
        }

    teams = json.load(open(filename))
    return [get_eval_data(team) for team in teams]


def main():
    try:
        if len(sys.argv) != 3:
            raise RuntimeError(f"Usage: {sys.argv[0]} <src json> <dst image>")
        plt.savefig(sys.argv[2])
        # draw_session(get_session("testmatch.json"))
        draw_session(get_session(sys.argv[1]))
        plt.savefig(sys.argv[2])
    except KeyboardInterrupt:
        exit(130)
    # except Exception as e:
    #     print('Error:', e, file=sys.stderr)
    #     exit(1)


if __name__ == "__main__":
    main()
