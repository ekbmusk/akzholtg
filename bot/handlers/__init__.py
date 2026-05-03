from aiogram import Router

from . import digest, favourites, help, history, library, start


def all_routers() -> list[Router]:
    return [
        start.router,
        library.router,
        history.router,
        favourites.router,
        digest.router,
        help.router,
    ]
