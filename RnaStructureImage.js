import React from "react";

const RnaStructureImage = ({ imageUrl }) => {
  if (!imageUrl) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "#999",
          fontStyle: "italic"
        }}
      >
        No structure image to display.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "60vh", overflowY: "auto", textAlign: "center" }}>
      <img
        src={imageUrl}
        alt="RNA Secondary Structure"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          border: "1px solid #ccc",
          borderRadius: "10px"
        }}
      />
    </div>
  );
};

export default RnaStructureImage;

