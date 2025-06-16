import { Flex, Spinner, Text } from "@radix-ui/themes";
import React from "react";

interface LoadingDialogProps {
  open: boolean;
  text?: string;
}

const LoadingDialog: React.FC<LoadingDialogProps> = ({
  open,
  text = "Submitting release...",
}) => (
  <dialog
    open={open}
    style={{
      position: "fixed",
      display: open ? "flex" : "none",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.9)",
      zIndex: 9999,
    }}
  >
    <Flex direction="column" align="center" gap="3">
      <Spinner
        size="3"
        style={{ color: "blue", width: "50px", height: "50px" }}
      />
      <Text size="8" color="blue" style={{ marginTop: "1rem" }}>
        {text}
      </Text>
    </Flex>
  </dialog>
);

export default LoadingDialog;
