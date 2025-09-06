import { state } from "rbind";
const count = state(0);
const pow2 = () => {
  const result = count.value * count.value;
  return result;
};
const calculate = operation => {
  return operation();
};
export const Counter = () => {
  const _div = document.createElement("div");
  count.register(() => {
    _div.setAttribute("class", count.value > 10 ? "counter big" : "count");
  })
  _div.setAttribute("class", count.value > 10 ? "counter big" : "count")
  const _h = document.createElement("h1");
  const _div2 = document.createElement("div");
  _div2.setAttribute("class", "double")
  count.register(() => {
    _div2.setAttribute("data-double", pow2());
  })
  _div2.setAttribute("data-double", pow2())
  const _button = document.createElement("button");
  _button.setAttribute("onClick", inc)
  const _button2 = document.createElement("button");
  _button2.setAttribute("onClick", dec)
  return;
};
a;