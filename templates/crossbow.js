module.exports = {
  config: {
    "envPrefix": "JS"
  },
  watch: {
    options: {
      debounce: 500
    },
    default: {
      "*.json": ["all"]
    }
  },
  tasks: {
    all: ["sleep", "hello-world"],
    "sleep@p": [
      "@sh sleep 1",
      "@sh sleep 1",
      "@sh sleep 1"
    ],
    "hello-world": "@sh echo $GREETING $JS_OPTIONS_PLACE"
  },
  env: {
    GREETING: "Hello"
  },
  options: {
    place: "world"
  }
};
