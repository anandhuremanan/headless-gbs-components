/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";

type AestheticProcessingAnimationProps = {
  progressPercentage: number;
};

const AestheticProcessingAnimation = ({
  progressPercentage,
}: AestheticProcessingAnimationProps) => {
  return (
    <div className="w-full max-w-md mx-auto p-2">
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-black rounded-full animate-processing"></div>
      </div>
      <p className="text-xs mt-2 text-center">
        Uploading in Progress {Math.floor(progressPercentage)}%, Please Wait...
      </p>
    </div>
  );
};

const AestheticProcessingAnimationWithStyles = ({
  progressPercentage,
}: AestheticProcessingAnimationProps) => (
  <AestheticProcessingAnimation progressPercentage={progressPercentage} />
);

export default AestheticProcessingAnimationWithStyles;
