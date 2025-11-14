/** @param {NS} ns */
export async function main(ns) {
  globalThis.webpack_require ?? webpackChunkbitburner.push([[-1], {}, w => globalThis.webpack_require = w]);

  Object.keys(webpack_require.m).forEach(k => Object.values(webpack_require(k)).forEach(p => p?.toPage?.('Dev')));
}

// export async function main(ns) {
//   // Navigate to dev tools in Bitburner v2
//   const boxes = Array.from(eval("document").querySelectorAll("[class*=MuiBox-root]"));
//   const boxProps = boxes.map(box => {
//     const keys = Object.keys(box);
//     const propKey = keys.find(key => key.includes("reactProps"));
//     return box[propKey].children.props;
//   });
//   const props = boxProps.find(el => el?.player);
//   props.router.toDevMenu();
// }