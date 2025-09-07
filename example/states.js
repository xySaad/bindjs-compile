import { state } from "rbind";
export const count = state(0);
export const getCount = () => {
  return count.value;
};
export const double = () => {
  return count.value * 2;
};
export const setCount = x => {
  count.value = x;
};