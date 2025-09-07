import { getCount, double, setCount } from "./states.rbind";
const calculate = operation => {
  return operation();
};
export const Counter = () => {
  const _div = document.createElement("div");
  _div.setAttribute("class", getCount() > 10 ? "counter big" : "count")
  const _h = document.createElement("h1");
  const _div2 = document.createElement("div");
  _div2.setAttribute("class", "double")
  _div2.setAttribute("data-double", calculate(double))
  const _button = document.createElement("button");
  _button.setAttribute("onClick", () => setCount(getCount() + 1))
  const _button2 = document.createElement("button");
  _button2.setAttribute("onClick", () => setCount(getCount() - 1))
  return;
};