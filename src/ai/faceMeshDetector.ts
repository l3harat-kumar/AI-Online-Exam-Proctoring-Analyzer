import { GazeRegion, GazeVector, HeadPose } from '../types/proctor';

declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
  }
}

export interface FaceAnalysisResult {
  faceDetected: boolean;
  faceCount: number;
  landmarks: any[] | null;
  headPose: HeadPose;
  gaze: GazeVector;
  earLeft: number;
  earRight: number;
  isBlinking: boolean;
  isLookingAway: boolean;
  suspiciousRegion: GazeRegion | null;
}

// Canonical Landmark Indices from MediaPipe FaceMesh
const NOSE_TIP = 1;
const NOSE_BRIDGE = 168;
const CHIN = 152;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 362;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;

/**
 * Calculates Eye Aspect Ratio (EAR)
 */
function calculateEAR(top: any, bottom: any, left: any, right: any): number {
  if (!top || !bottom || !left || !right) return 0.25;
  const vertDist = Math.hypot(top.x - bottom.x, top.y - bottom.y);
  const horizDist = Math.hypot(left.x - right.x, left.y - right.y);
  return vertDist / (horizDist || 1);
}

/**
 * Calculates 3D Head Pose (Yaw, Pitch, Roll) from 3D Face Landmarks
 */
export function estimateHeadPose(landmarks: any[]): HeadPose {
  if (!landmarks || landmarks.length < 468) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const noseTip = landmarks[NOSE_TIP];
  const noseBridge = landmarks[NOSE_BRIDGE];
  const chin = landmarks[CHIN];
  const leftEyeOuter = landmarks[LEFT_EYE_OUTER];
  const rightEyeOuter = landmarks[RIGHT_EYE_OUTER];

  // 1. Roll: Angle between left and right eye in the 2D plane
  const deltaX = rightEyeOuter.x - leftEyeOuter.x;
  const deltaY = rightEyeOuter.y - leftEyeOuter.y;
  const rollRad = Math.atan2(deltaY, deltaX);
  const roll = (rollRad * 180) / Math.PI;

  // 2. Yaw: Horizontal displacement of nose tip between eye midpoint
  const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeDistance = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
  const noseOffsetX = (noseTip.x - eyeMidX) / (eyeDistance || 1);
  const yaw = Math.max(-90, Math.min(90, noseOffsetX * 150));

  // 3. Pitch: Vertical displacement of nose tip between nose bridge and chin
  const verticalSpan = Math.abs(chin.y - noseBridge.y);
  const noseRelativeY = (noseTip.y - noseBridge.y) / (verticalSpan || 1);
  // Neutral noseRelativeY is usually ~0.35-0.45
  const pitchOffset = (noseRelativeY - 0.40) * 160;
  const pitch = Math.max(-90, Math.min(90, pitchOffset));

  return {
    yaw: Math.round(yaw * 10) / 10,
    pitch: Math.round(pitch * 10) / 10,
    roll: Math.round(roll * 10) / 10,
  };
}

/**
 * Calculates eye gaze vector and determines screen gaze region
 */
export function estimateGaze(landmarks: any[], headPose: HeadPose): GazeVector {
  if (!landmarks || landmarks.length < 468) {
    return { x: 0.5, y: 0.5, region: 'CENTER', confidence: 0.8 };
  }

  const leftIris = landmarks[LEFT_IRIS_CENTER] || landmarks[468] || landmarks[LEFT_EYE_INNER];
  const rightIris = landmarks[RIGHT_IRIS_CENTER] || landmarks[473] || landmarks[RIGHT_EYE_INNER];
  
  const leftEyeIn = landmarks[LEFT_EYE_INNER];
  const leftEyeOut = landmarks[LEFT_EYE_OUTER];
  const rightEyeIn = landmarks[RIGHT_EYE_INNER];
  const rightEyeOut = landmarks[RIGHT_EYE_OUTER];

  // Calculate ratio of iris position within eye boundaries (0 = left, 1 = right)
  let leftIrisRatioX = 0.5;
  let rightIrisRatioX = 0.5;

  if (leftEyeIn && leftEyeOut && leftIris) {
    const totalW = Math.abs(leftEyeIn.x - leftEyeOut.x);
    if (totalW > 0.001) {
      leftIrisRatioX = (leftIris.x - leftEyeOut.x) / (leftEyeIn.x - leftEyeOut.x);
    }
  }

  if (rightEyeIn && rightEyeOut && rightIris) {
    const totalW = Math.abs(rightEyeOut.x - rightEyeIn.x);
    if (totalW > 0.001) {
      rightIrisRatioX = (rightIris.x - rightEyeIn.x) / (rightEyeOut.x - rightEyeIn.x);
    }
  }

  const avgIrisRatioX = (leftIrisRatioX + rightIrisRatioX) / 2;

  // Combine Iris relative offset with Head Pose Yaw & Pitch for final gaze screen coordinate
  // Screen X: 0.0 (far left) to 1.0 (far right)
  // Mirroring correction for selfie webcam view:
  const gazeXRaw = 0.5 + (headPose.yaw / 60) * 0.4 + (avgIrisRatioX - 0.5) * 0.6;
  const gazeYRaw = 0.5 + (headPose.pitch / 50) * 0.45;

  const gazeX = Math.max(0, Math.min(1, gazeXRaw));
  const gazeY = Math.max(0, Math.min(1, gazeYRaw));

  // Determine Gaze Region
  let region: GazeRegion = 'CENTER';

  // Check off-screen extremities
  if (headPose.yaw < -28 || gazeX < 0.12) {
    region = 'OFF_SCREEN_LEFT';
  } else if (headPose.yaw > 28 || gazeX > 0.88) {
    region = 'OFF_SCREEN_RIGHT';
  } else if (headPose.pitch > 26 || gazeY > 0.88) {
    region = 'OFF_SCREEN_DOWN';
  } else if (headPose.pitch < -24 || gazeY < 0.12) {
    region = 'OFF_SCREEN_UP';
  } else {
    // Within screen boundaries - test 4 corners vs center
    const isLeft = gazeX < 0.35;
    const isRight = gazeX > 0.65;
    const isTop = gazeY < 0.35;
    const isBottom = gazeY > 0.65;

    if (isTop && isLeft) region = 'TOP_LEFT';
    else if (isTop && isRight) region = 'TOP_RIGHT';
    else if (isBottom && isLeft) region = 'BOTTOM_LEFT';
    else if (isBottom && isRight) region = 'BOTTOM_RIGHT';
    else if (isTop) region = 'TOP_CENTER';
    else if (isBottom) region = 'BOTTOM_CENTER';
    else region = 'CENTER';
  }

  return {
    x: Math.round(gazeX * 100) / 100,
    y: Math.round(gazeY * 100) / 100,
    region,
    confidence: 0.92
  };
}

/**
 * Performs full behavioral feature extraction on raw MediaPipe FaceMesh output
 */
export function analyzeFaceFrame(landmarksList: any[][]): FaceAnalysisResult {
  if (!landmarksList || landmarksList.length === 0) {
    return {
      faceDetected: false,
      faceCount: 0,
      landmarks: null,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      gaze: { x: 0.5, y: 0.5, region: 'CENTER', confidence: 0 },
      earLeft: 0,
      earRight: 0,
      isBlinking: false,
      isLookingAway: false,
      suspiciousRegion: null
    };
  }

  const faceCount = landmarksList.length;
  const primaryLandmarks = landmarksList[0];
  const headPose = estimateHeadPose(primaryLandmarks);
  const gaze = estimateGaze(primaryLandmarks, headPose);

  const earLeft = calculateEAR(
    primaryLandmarks[LEFT_EYE_TOP],
    primaryLandmarks[LEFT_EYE_BOTTOM],
    primaryLandmarks[LEFT_EYE_OUTER],
    primaryLandmarks[LEFT_EYE_INNER]
  );
  const earRight = calculateEAR(
    primaryLandmarks[RIGHT_EYE_TOP],
    primaryLandmarks[RIGHT_EYE_BOTTOM],
    primaryLandmarks[RIGHT_EYE_OUTER],
    primaryLandmarks[RIGHT_EYE_INNER]
  );

  const isBlinking = earLeft < 0.16 && earRight < 0.16;

  // Evaluate if looking away from core exam area
  const isLookingAway = 
    gaze.region.startsWith('OFF_SCREEN') ||
    Math.abs(headPose.yaw) > 22 ||
    headPose.pitch > 22 ||
    headPose.pitch < -20;

  const isCornerGaze = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'].includes(gaze.region);

  return {
    faceDetected: true,
    faceCount,
    landmarks: primaryLandmarks,
    headPose,
    gaze,
    earLeft: Math.round(earLeft * 100) / 100,
    earRight: Math.round(earRight * 100) / 100,
    isBlinking,
    isLookingAway,
    suspiciousRegion: isCornerGaze || isLookingAway ? gaze.region : null
  };
}

/**
 * Draws Augmented AI HUD & 3D wireframe mesh on HTML5 Canvas
 */
export function drawFaceTelemetryOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  analysis: FaceAnalysisResult
) {
  ctx.clearRect(0, 0, width, height);

  if (!analysis.faceDetected || !analysis.landmarks) {
    // Face not detected warning overlay
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('NO FACE DETECTED', width / 2, height / 2);
    return;
  }

  const landmarks = analysis.landmarks;

  // 1. Draw facial contour points
  ctx.fillStyle = analysis.isLookingAway ? 'rgba(239, 68, 68, 0.7)' : 'rgba(99, 102, 241, 0.6)';
  
  // Draw key landmark mesh points
  const keyIndices = [
    1, 33, 133, 159, 145, 263, 362, 386, 374, 61, 291, 152, 10, 150, 176, 400, 379
  ];

  keyIndices.forEach(idx => {
    const pt = landmarks[idx];
    if (pt) {
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // 2. Connect Eye Contours
  ctx.strokeStyle = analysis.isLookingAway ? '#ef4444' : '#06b6d4';
  ctx.lineWidth = 1.5;

  // Left Eye loop
  const leftEyeLoop = [33, 160, 158, 133, 153, 144, 33];
  ctx.beginPath();
  leftEyeLoop.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (pt) {
      if (i === 0) ctx.moveTo(pt.x * width, pt.y * height);
      else ctx.lineTo(pt.x * width, pt.y * height);
    }
  });
  ctx.stroke();

  // Right Eye loop
  const rightEyeLoop = [263, 387, 385, 362, 380, 373, 263];
  ctx.beginPath();
  rightEyeLoop.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (pt) {
      if (i === 0) ctx.moveTo(pt.x * width, pt.y * height);
      else ctx.lineTo(pt.x * width, pt.y * height);
    }
  });
  ctx.stroke();

  // 3. Highlight Iris centers
  const leftIris = landmarks[LEFT_IRIS_CENTER];
  const rightIris = landmarks[RIGHT_IRIS_CENTER];

  if (leftIris) {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(leftIris.x * width, leftIris.y * height, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (rightIris) {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(rightIris.x * width, rightIris.y * height, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 4. Draw 3D Head Orientation Ray from Nose Tip
  const nose = landmarks[NOSE_TIP];
  if (nose) {
    const noseX = nose.x * width;
    const noseY = nose.y * height;
    
    // Gaze direction vector projection
    const rayLength = 65;
    const radYaw = (analysis.headPose.yaw * Math.PI) / 180;
    const radPitch = (analysis.headPose.pitch * Math.PI) / 180;

    const targetX = noseX + Math.sin(radYaw) * rayLength;
    const targetY = noseY + Math.sin(radPitch) * rayLength;

    // Outer glow for ray
    ctx.strokeStyle = analysis.isLookingAway ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Ray tip circle
    ctx.fillStyle = analysis.isLookingAway ? '#ef4444' : '#10b981';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 5. Bounding Face Reticle
  const noseBridge = landmarks[NOSE_BRIDGE];
  const chin = landmarks[CHIN];
  const leftEye = landmarks[LEFT_EYE_OUTER];
  const rightEye = landmarks[RIGHT_EYE_OUTER];

  if (noseBridge && chin && leftEye && rightEye) {
    const minX = Math.min(leftEye.x, rightEye.x) * width - 30;
    const maxX = Math.max(leftEye.x, rightEye.x) * width + 30;
    const minY = (noseBridge.y * height) - 40;
    const maxY = (chin.y * height) + 25;

    ctx.strokeStyle = analysis.isLookingAway ? 'rgba(239, 68, 68, 0.5)' : 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);
  }
}
