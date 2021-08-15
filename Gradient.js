const { useState, createElement } = React;

function calcRelativeXPositionRate(clientX, element) {
  return (clientX - element.getBoundingClientRect().left) / element.clientWidth;
}
function calcRelativeYPositionRate(clientY, element) {
  return (clientY - element.getBoundingClientRect().top) / element.clientHeight;
}

function getKeyHash(key) {
  let ret = "";
  if (key.color) {
    return `c-${key.color.r & key.color.g & key.color.b}-${key.time}`;
  } else {
    return `a-${key.alpha}-${key.time}`;
  }
}

function Gradient() {
  const [value, setValue] = useState({
    colorKeys: [
      {
        color: { r: 1, g: 0, b: 0, a: 1 },
        time: 0,
      },
      {
        color: { r: 0, g: 0, b: 1, a: 1 },
        time: 0.5,
      },
      {
        color: { r: 0, g: 1, b: 0, a: 1 },
        time: 1,
      },
    ],
    alphaKeys: [
      {
        alpha: 1,
        time: 0,
      },
      {
        alpha: 0.5,
        time: 0.5,
      },
      {
        alpha: 1,
        time: 1,
      },
    ],
    mode: "Blend",
  });

  const [selectedPin, setSelectedPin] = useState(undefined);

  //   const gradient = "";
  //   React.useEffect(() => {
  //     createGradient();
  //   }, [value]);
  const createGradient = () => {
    return `linear-gradient(to right,${value.colorKeys
      .map(
        (key) =>
          `rgb(${key.color.r * 255},${key.color.g * 255},${
            key.color.b * 255
          }) ${key.time * 100}%`
      )
      .join(`,`)})`;
  };

  const handleDoubleClick = (event) => {
    const xpos = calcRelativeXPositionRate(event.clientX, event.target);
    const ypos = calcRelativeYPositionRate(event.clientY, event.target);

    const isAlpha = ypos < 0.5;
    if (isAlpha) {
      setValue((value) => {
        return {
          ...value,
          alphaKeys: [
            ...value.alphaKeys,
            {
              alpha: 1,
              time: xpos,
            },
          ],
        };
      });
    } else {
      setValue((value) => {
        return {
          ...value,
          colorKeys: [
            ...value.colorKeys,
            {
              color: { r: 255, g: 255, b: 255, a: 1 },
              time: xpos,
            },
          ],
        };
      });
    }
  };

  return React.createElement(
    "div",
    {
      className: "gradient-container",
      style: {
        background: createGradient(),
      },
      onDoubleClick: (event) => {
        console.log("double click!", event);
        handleDoubleClick(event);
      },
    },
    [
      // children
      ...value.alphaKeys.map((key, index) =>
        React.createElement(
          Pin,
          {
            position: key.time,
            isLower: false,
            key: getKeyHash(key),
            onChange: (position) => {
              setValue((value) => {
                value.alphaKeys[index].time = position;
                return { ...value };
              });
              console.log(value);
            },
            onClick: () => {
              setSelectedPin(key);
              console.log(selectedPin);
            },
            onDelete: () => {
              console.log("delete", index);
              setValue((value) => {
                value.alphaKeys.splice(index, 1);
                console.log(value.alphaKeys);
                return { ...value };
              });
            },
          },
          null
        )
      ),
      ...value.colorKeys.map((key, index) =>
        React.createElement(
          Pin,
          {
            position: key.time,
            isLower: true,
            key: getKeyHash(key),
            onChange: (position) => {
              setValue((value) => {
                value.colorKeys[index].time = position;
                return { ...value };
              });
              console.log(value);
            },
            onClick: () => {
              setSelectedPin(key);
              console.log(selectedPin);
            },
            onDelete: () => {
              console.log("delete", index);
              setValue((value) => {
                value.colorKeys.splice(index, 1);
                return { ...value };
              });
            },
          },
          null
        )
      ),
      React.createElement(
        InputColor,
        {
          color: selectedPin?.color,
          style: {
            // visible: !!selectedPin.color,
            position: "absolute",
            left: `calc(${(selectedPin?.time ?? 0) * 100}% - 21px)`,
            bottom: -30,
          },
          onChange: (color) => {
            const index = value.colorKeys.indexOf(selectedPin);
            const rgb = {
              r: parseInt(color.substring(1, 3), 16) / 255,
              g: parseInt(color.substring(3, 5), 16) / 255,
              b: parseInt(color.substring(5, 7), 16) / 255,
              a: 1,
            };
            setValue((value) => {
              value.colorKeys[index] = {
                ...value.colorKeys[index],
                color: rgb,
              };
              return { ...value };
            });
            if (index > 0) {
            } else {
              console.log(color);
              console.log(selectedPin);
              console.log(value.colorKeys);
            }
          },
        },
        null
      ),
    ]
  );
}
function Pin(props) {
  const [position, setPosition] = useState(props.position);
  const handleDragStart = function (event) {};

  const handleDrag = function (event) {
    const relativeX =
      event.clientX - event.target.parentNode.getBoundingClientRect().x;
    const parentWidth = event.target.parentNode.offsetWidth;
    const rawPosition = relativeX / parentWidth;
    if (rawPosition < 0) {
      return;
    }
    const clampedPosition = Math.min(Math.max(rawPosition, 0), 1);
    setPosition(clampedPosition);
  };

  const handleClick = function (event) {
    if (props.onClick) {
      props.onClick();
    }
  };

  const handleDragEnd = function (event) {
    console.log(
      event.clientY,
      event.target.parentNode.getBoundingClientRect().top
    );

    if (
      event.target.parentNode.getBoundingClientRect().top - event.clientY >
        20 ||
      (props.isLower &&
        event.target.parentNode.getBoundingClientRect().bottom - event.clientY <
          -20)
    ) {
      if (props.onDelete) {
        props.onDelete(props.index);
        return;
      }
    }

    if (props.onChange) {
      props.onChange(position);
    }
  };

  const createStyle = () => {
    const common = {
      left: `calc(${position * 100}% - 5px)`,
    };

    return props.isLower ? { ...common, bottom: -5 } : { ...common, top: -5 };
  };

  return React.createElement(
    "div",
    {
      draggable: true,
      className: "pin",
      style: createStyle(),
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      onClick: handleClick,
    },
    null
  );
}

function InputColor(props) {
  const [color, setColor] = React.useState(props.color);

  const handleChange = (event) => {
    setColor(event.target.value);
    if (props.onChange) {
      props.onChange(event.target.value);
    }
  };

  return React.createElement(
    "input",
    {
      type: "color",
      value: color,
      onChange: handleChange,
      style: props.style,
    },
    null
  );
}

ReactDOM.render(
  React.createElement(Gradient, null, null),
  document.getElementById("root")
);
