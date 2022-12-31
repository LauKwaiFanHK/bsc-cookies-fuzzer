// For changing value of extracted cookies
const fuzzedValues = [
  "fuzz", // random string
  "AAAAAAAAAAAAAAAAA",
  "BBBBBBBBBBBBBBBBB",
  "abc;defgh",
  0, // zero
  -1, // negative number
  5, // integer
  18.4, // float number
  0.000000002479, // very small number
  7.3e9, // very big number
  "0 x 1000", // Integer overflows
  "0 x 3fffffff",
  "0 x 7ffffffe",
  "0 x fffffffe",
  "0 x ffffffff",
  '>"><script>alert("XSS")</script>', // Buffer overflows
  '"";!--"<XSS>=&{()}',
  "A x 5",
  "A x 257",
  "A x 12288",
  "%s%p%x%d", // Format string errors
  ".1024d",
  "%.2049d",
  "%p%p%p%p",
  "%x%x%x%x",
  "%d%d%d%d",
  "%s%s%s%s",
  "%99999999999s",
  "%08x",
  "%%20d",
  "%%20n",
  "%%20x",
  "%%20s",
  "%s%s%s%s%s%s%s%s%s%s%s%s",
  "%p%p%p%p%p%p%p%p%p%p%p%p",
  "%#0123456x%08x%x%s%p%d%n%o%u%c%h%1",
  "%s x 129",
  "%x x 257",
  ".||",
  "' OR '1'='1", // Passive SQL Injection
];

const fuzzedSeparators = [
  "/",
  "==",
  "===",
  "&",
  "~",
  "!",
  "@",
  "#",
  "$",
  "%",
  "^",
  "*",
  "()",
  "(",
  ")",
  "-",
  "+",
  "=",
  "_",
  "''",
  "|",
  "[]",
  "[",
  "]",
  "{}",
  "?",
  "<",
  ">",
  ".",
  ":",
];

const randomCookies = [
  "fuzz=randomInput; ",
  "fuzz=AAAAAAAAAAAA; ",
  "user=admin; ",
  "user=root; ",
];

export { fuzzedValues, fuzzedSeparators, randomCookies };