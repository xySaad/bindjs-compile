import { state, list } from "rbind";
const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];
const random = max => Math.round(Math.random() * 1000) % max;
let nextId = 1;
const buildData = count => {
  let data = Array.from({
    length: count
  });
  for (let i = 0; i < count; i++) {
    const label = state(`${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`);
    data[i] = {
      id: nextId++,
      label
    };
  }
  return data;
};
const data = list([]);
const selected = state(null);
const run = () => {
  data = [...buildData(1000)];
};
const runLots = () => {
  data = [...buildData(10000)];
};
const add = () => data.push(...buildData(1000));
const update = () => {
  for (let i = 0, d = data, len = d.length; i < len; i += 10) {
    d[i].label += " !!!";
  }
};
const swapRows = () => {
  if (data.length > 998) {
    const first = data[1];
    const _998 = data[998];
    data.batch(() => {
      data[1] = _998;
      data[998] = first;
    });
  }
};
const Button = ([id, text, fn]) => {
  const _el = document.createElement("div"),
    _el2 = document.createElement("button");
  _el.setAttribute("class", "col-sm-6 smallpad")
  const _frag = document.createDocumentFragment();
  const _textNode = document.createTextNode("\n    ");
  _frag.append(_textNode)
  _el2.setAttribute("id", id)
  _el2.setAttribute("class", "btn btn-primary btn-block")
  _el2.setAttribute("type", "button")
  _el2.setAttribute("onClick", fn)
  const _frag2 = document.createDocumentFragment();
  const _textNode2 = document.createTextNode("\n      ");
  _frag2.append(_textNode2)
  const _textNode3 = document.createTextNode(text);
  _frag2.append(_textNode3)
  const _textNode4 = document.createTextNode("\n    ");
  _frag2.append(_textNode4)
  _el2.append(_frag2)
  _frag.append(_el2)
  const _textNode5 = document.createTextNode("\n  ");
  _frag.append(_textNode5)
  _el.append(_frag)
  return _el;
};
export const App = () => {
  const _el3 = document.createElement("div"),
    _el4 = document.createElement("div"),
    _el5 = document.createElement("div"),
    _el6 = document.createElement("div"),
    _el7 = document.createElement("h1"),
    _el8 = document.createElement("div"),
    _el9 = document.createElement("div"),
    _el0 = document.createElement("Button"),
    _el1 = document.createElement("Button"),
    _el10 = document.createElement("Button"),
    _el11 = document.createElement("Button"),
    _el12 = document.createElement("Button"),
    _el13 = document.createElement("Button"),
    _el14 = document.createElement("table"),
    _el15 = document.createElement("tbody");
  _el3.setAttribute("class", "container")
  const _frag3 = document.createDocumentFragment();
  const _textNode6 = document.createTextNode("\n    ");
  _frag3.append(_textNode6)
  _el4.setAttribute("class", "jumbotron")
  const _frag4 = document.createDocumentFragment();
  const _textNode7 = document.createTextNode("\n      ");
  _frag4.append(_textNode7)
  _el5.setAttribute("class", "row")
  const _frag5 = document.createDocumentFragment();
  const _textNode8 = document.createTextNode("\n        ");
  _frag5.append(_textNode8)
  _el6.setAttribute("class", "col-md-6")
  const _frag6 = document.createDocumentFragment();
  const _textNode9 = document.createTextNode("\n          ");
  _frag6.append(_textNode9)
  const _frag7 = document.createDocumentFragment();
  const _textNode0 = document.createTextNode("rbind");
  _frag7.append(_textNode0)
  _el7.append(_frag7)
  _frag6.append(_el7)
  const _textNode1 = document.createTextNode("\n        ");
  _frag6.append(_textNode1)
  _el6.append(_frag6)
  _frag5.append(_el6)
  const _textNode10 = document.createTextNode("\n        ");
  _frag5.append(_textNode10)
  _el8.setAttribute("class", "col-md-6")
  const _frag8 = document.createDocumentFragment();
  const _textNode11 = document.createTextNode("\n          ");
  _frag8.append(_textNode11)
  _el9.setAttribute("class", "row")
  const _frag9 = document.createDocumentFragment();
  const _textNode12 = document.createTextNode("\n            ");
  _frag9.append(_textNode12)
  _el0.setAttribute("id", "run")
  _el0.setAttribute("text", "Create 1,000 rows")
  _el0.setAttribute("fn", run)
  const _frag0 = document.createDocumentFragment();
  _el0.append(_frag0)
  _frag9.append(_el0)
  const _textNode13 = document.createTextNode("\n            ");
  _frag9.append(_textNode13)
  _el1.setAttribute("id", "runlots")
  _el1.setAttribute("text", "Create 10,000 rows")
  _el1.setAttribute("fn", runLots)
  const _frag1 = document.createDocumentFragment();
  _el1.append(_frag1)
  _frag9.append(_el1)
  const _textNode14 = document.createTextNode("\n            ");
  _frag9.append(_textNode14)
  _el10.setAttribute("id", "add")
  _el10.setAttribute("text", "Append 1,000 rows")
  _el10.setAttribute("fn", add)
  const _frag10 = document.createDocumentFragment();
  _el10.append(_frag10)
  _frag9.append(_el10)
  const _textNode15 = document.createTextNode("\n            ");
  _frag9.append(_textNode15)
  _el11.setAttribute("id", "update")
  _el11.setAttribute("text", "Update every 10th row")
  _el11.setAttribute("fn", update)
  const _frag11 = document.createDocumentFragment();
  _el11.append(_frag11)
  _frag9.append(_el11)
  const _textNode16 = document.createTextNode("\n            ");
  _frag9.append(_textNode16)
  _el12.setAttribute("id", "clear")
  _el12.setAttribute("text", "Clear")
  _el12.setAttribute("fn", () => data.clear())
  const _frag12 = document.createDocumentFragment();
  _el12.append(_frag12)
  _frag9.append(_el12)
  const _textNode17 = document.createTextNode("\n            ");
  _frag9.append(_textNode17)
  _el13.setAttribute("id", "swaprows")
  _el13.setAttribute("text", "Swap Rows")
  _el13.setAttribute("fn", swapRows)
  const _frag13 = document.createDocumentFragment();
  _el13.append(_frag13)
  _frag9.append(_el13)
  const _textNode18 = document.createTextNode("\n          ");
  _frag9.append(_textNode18)
  _el9.append(_frag9)
  _frag8.append(_el9)
  const _textNode19 = document.createTextNode("\n        ");
  _frag8.append(_textNode19)
  _el8.append(_frag8)
  _frag5.append(_el8)
  const _textNode20 = document.createTextNode("\n      ");
  _frag5.append(_textNode20)
  _el5.append(_frag5)
  _frag4.append(_el5)
  const _textNode21 = document.createTextNode("\n    ");
  _frag4.append(_textNode21)
  _el4.append(_frag4)
  _frag3.append(_el4)
  const _textNode22 = document.createTextNode("\n    ");
  _frag3.append(_textNode22)
  _el14.setAttribute("class", "table table-hover table-striped test-data")
  const _frag14 = document.createDocumentFragment();
  const _textNode23 = document.createTextNode("\n      ");
  _frag14.append(_textNode23)
  const _frag15 = document.createDocumentFragment();
  const _textNode24 = document.createTextNode("\n        ");
  _frag15.append(_textNode24)
  const _textNode25 = document.createTextNode(data.map((row, idx) => {
    const _el16 = document.createElement("tr"),
      _el17 = document.createElement("td"),
      _el18 = document.createElement("td"),
      _el19 = document.createElement("a"),
      _el20 = document.createElement("td"),
      _el21 = document.createElement("a"),
      _el22 = document.createElement("span"),
      _el23 = document.createElement("td");
    _el16.setAttribute("class", selected == row.id ? "danger" : "")
    const _frag16 = document.createDocumentFragment();
    const _textNode29 = document.createTextNode("\n              ");
    _frag16.append(_textNode29)
    _el17.setAttribute("class", "col-md-1")
    const _frag17 = document.createDocumentFragment();
    const _textNode30 = document.createTextNode(row.id);
    _frag17.append(_textNode30)
    _el17.append(_frag17)
    _frag16.append(_el17)
    const _textNode31 = document.createTextNode("\n              ");
    _frag16.append(_textNode31)
    _el18.setAttribute("class", "col-md-4")
    const _frag18 = document.createDocumentFragment();
    const _textNode32 = document.createTextNode("\n                ");
    _frag18.append(_textNode32)
    _el19.setAttribute("onClick", () => selected = row.id)
    const _frag19 = document.createDocumentFragment();
    const _textNode33 = document.createTextNode(row.label);
    _frag19.append(_textNode33)
    _el19.append(_frag19)
    _frag18.append(_el19)
    const _textNode34 = document.createTextNode("\n              ");
    _frag18.append(_textNode34)
    _el18.append(_frag18)
    _frag16.append(_el18)
    const _textNode35 = document.createTextNode("\n              ");
    _frag16.append(_textNode35)
    _el20.setAttribute("class", "col-md-1")
    const _frag20 = document.createDocumentFragment();
    const _textNode36 = document.createTextNode("\n                ");
    _frag20.append(_textNode36)
    _el21.setAttribute("onClick", () => data.remove(idx()))
    const _frag21 = document.createDocumentFragment();
    const _textNode37 = document.createTextNode("\n                  ");
    _frag21.append(_textNode37)
    _el22.setAttribute("class", "glyphicon glyphicon-remove")
    _el22.setAttribute("aria-hidden", "true")
    const _frag22 = document.createDocumentFragment();
    _el22.append(_frag22)
    _frag21.append(_el22)
    const _textNode38 = document.createTextNode("\n                ");
    _frag21.append(_textNode38)
    _el21.append(_frag21)
    _frag20.append(_el21)
    const _textNode39 = document.createTextNode("\n              ");
    _frag20.append(_textNode39)
    _el20.append(_frag20)
    _frag16.append(_el20)
    const _textNode40 = document.createTextNode("\n              ");
    _frag16.append(_textNode40)
    _el23.setAttribute("class", "col-md-6")
    const _frag23 = document.createDocumentFragment();
    _el23.append(_frag23)
    _frag16.append(_el23)
    const _textNode41 = document.createTextNode("\n            ");
    _frag16.append(_textNode41)
    _el16.append(_frag16)
    return _el16;
  }));
  _frag15.append(_textNode25)
  const _textNode26 = document.createTextNode("\n      ");
  _frag15.append(_textNode26)
  _el15.append(_frag15)
  _frag14.append(_el15)
  const _textNode27 = document.createTextNode("\n    ");
  _frag14.append(_textNode27)
  _el14.append(_frag14)
  _frag3.append(_el14)
  const _textNode28 = document.createTextNode("\n  ");
  _frag3.append(_textNode28)
  _el3.append(_frag3)
  return _el3;
};