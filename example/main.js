const chat = state({
  room: "general",
  id: 5,
  chat: list([
    {
      user: "alice",
      online: false,
    },
    {
      user: "bob",
      online: false,
    },
  ]),
});
