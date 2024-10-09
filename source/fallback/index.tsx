import React from "react";

export default function Fallback(props: any) {
  const { component } = props;
  return (
    <div>
      <p>oops {component} failed!!</p>
      <button>Raise an Issue</button>
    </div>
  );
}
