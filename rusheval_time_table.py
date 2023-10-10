from PIL import Image, ImageDraw, ImageFont, ImageColor
import numpy as np
import sys
import json
import matplotlib.pyplot as plt
from itertools import zip_longest
import matplotlib.colors as pltcolor

# slots | defence
# 0 blue  | blue, purple, blue, purple
# 1 white | yellow, white, yellow, white
# 2 blue  | blue, purple, blue, purple
# 3 white | white, yellow, white, yellow
# 4 blue  | blue, purple, blue, purple
# 5 white | yellow, white, yellow, white
#    0        1       2       3      4

# if i_slot is even
# blue | blue purple pattern
# else
# yield cycle of (white | yellow, white) and (white | white, yellow)

    # slots | defence evaluation matching
    # 10    | time, slots...
    # 11    | time, slots...
    # 2     | time, slots...
    # 3     | time, slots...
    # 4     | time, slots...
    # 5     | time, slots...

def create_figure():
    plt.figure(linewidth=2,
            #    figsize=(10, 5),
        #    edgecolor=fig_border,
        #    facecolor=fig_background_color,
           tight_layout={'pad':1},
            # dpi=300
           #figsize=(5,3)
          )
    plt.gca().get_xaxis().set_visible(False)
    plt.gca().get_yaxis().set_visible(False)
    plt.box(on=None)
    plt.suptitle("Evaluation Time Table")

def draw_image(sessions: list):
    # plt.draw()
    create_figure()
    data = {time: [] for time in ('10:00AM', '11:00AM', '2:00PM', '3:00PM', '4:00PM', '5:00PM')}
    for session in sessions:
        team = f"team: {session['leader']}"
        cadet = f"cadet: {session['evaluator']}"
        data[session['time']].append(f"{team}\n{cadet}")
    # np.array require the size to be homogeneous
    lst = np.array([value for value in zip_longest(*data.values(), fillvalue='')])
    # Construct a new array for ownership, since transpose does not return a new object but resize require it
    lst = np.array(lst.transpose())
    lst.resize((6, 4))
    table = plt.table(
            rowLabels=list(data.keys()),
            rowLoc='right',
            cellLoc='left',
            # colLabels='                                  ', # for testing purpose
            loc='center',
            cellText=lst,
        )
    table.auto_set_column_width(list(range(4)))
    # table.auto_set_font_size(False)
    # cells = table.get_celld().values()
    # cellsizes = [(cell.get_width(), cell.get_height()) for cell in cells]
    # cellsizes = np.array(cellsizes)
    # max_width = max(cellsizes, key=lambda size: size[0])[0]
    # for cell in table.get_celld().values():
    #     if cell.get_width() != max_width:
    #         cell.set_width(max_width)
    #         print(cell.get_width())
    # [print(value) for value in table.get_celld().values()]
    # for cell in table.get_celld().values():
    #     cell.set_width(.2)
    # print(cellsizes)
    # print(cellsizes.max())
    # get max width
    # for cell in cells:
    #     cell.
    for pos, cell in table.get_celld().items():
        print(f"{pos}: {cell}")
        cell.set_height(cell.get_height() * 2)
        y, x = pos
        
        def blue_purple(x: int):
            blue = "#c8daf8"
            purple = "#dad1e9"

            return [purple, blue][x == -1 or x % 2 == 0]
        def white_yellow(x: int):
            white = "#ffffff"
            yellow = "#fff2cc"

            return [yellow, white][x == -1 or x % 2 == 0]

        # if y == 0:
        #     continue
        if cell.get_text().get_text() == '':
            facecolor = "#000000"
            cell.set_edgecolor("#393939")
        # if False:
        #     pass
        elif y % 2 == 0:
            facecolor = blue_purple(x)
        else:
            facecolor = white_yellow(x + ((y + 1) / 4).is_integer())
        cell.set_facecolor(pltcolor.hex2color(facecolor))


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
        draw_image(get_session("testmatch.json"))
        # draw_image(get_session(sys.argv[1]))
        print(f'saving table to {sys.argv[2]}')
        plt.savefig(sys.argv[2])
    except KeyboardInterrupt:
        exit(130)
    # except Exception as e:
    #     print('Error:', e, file=sys.stderr)
    #     exit(1)


# # Create the figure. Setting a small pad on tight_layout
# # seems to better regulate white space. Sometimes experimenting
# # with an explicit figsize here can produce better outcome.
# plt.figure(linewidth=2,
#            edgecolor=fig_border,
#            facecolor=fig_background_color,
#            tight_layout={'pad':1},
#            #figsize=(5,3)
#           )
# # Force the figure to update, so backends center objects correctly within the figure.
# # Without plt.draw() here, the title will center on the axes and not the figure.
# plt.draw()

if __name__ == "__main__":
    main()
