(async () => {
  'use strict';

  const CONFIG = {
    slideIntervalMs: 11000,
    defaultLocation: 'The Crossings',
    fallbackLatitude: 25.6707,
    fallbackLongitude: -80.4012,
    fallbackTimezone: 'America/New_York',
    phoneNumber: '+1 305 308-9477',
    phoneHref: '+13053089477',
    geoapifyApiKey: 'db526e49567e40fd94670d78894012be',  
    bookingEndpoint: 'https://formsubmit.co/ajax/alirtaza@gmail.com',  
    storageKey: 'drivevista_reservations_v1'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let screenWakeLock = null;
  let wakeLockRequestInFlight = null;
  let wakeLockUserGestureSeen = false;
  const startExperience = $('#startExperience');
  const isAppleTouchDevice = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const wakeLockSupported = 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function';
  console.info(`[Safari] Wake Lock ${wakeLockSupported ? 'supported' : 'not supported'}`);

  async function requestScreenWakeLock(reason = 'user gesture') {
    if (!wakeLockSupported) return false;
    if (document.visibilityState !== 'visible') return false;
    if (!wakeLockUserGestureSeen) return false;
    if (screenWakeLock && !screenWakeLock.released) return true;
    if (wakeLockRequestInFlight) return wakeLockRequestInFlight;

    wakeLockRequestInFlight = navigator.wakeLock.request('screen')
      .then((sentinel) => {
        screenWakeLock = sentinel;
        console.info(`[Safari] Wake Lock active (${reason})`);
        if (startExperience) startExperience.hidden = true;
        sentinel.addEventListener('release', () => {
          console.info('[Safari] Wake Lock released');
          if (screenWakeLock === sentinel) screenWakeLock = null;
          if (startExperience && isAppleTouchDevice) startExperience.hidden = false;
        }, { once: true });
        return true;
      })
      .catch((error) => {
        screenWakeLock = null;
        console.warn('[Safari] Wake Lock error', error);
        return false;
      })
      .finally(() => {
        wakeLockRequestInFlight = null;
      });

    return wakeLockRequestInFlight;
  }

  function handleWakeLockUserGesture() {
    wakeLockUserGestureSeen = true;
    requestScreenWakeLock('user gesture');
  }

  if (startExperience && isAppleTouchDevice && wakeLockSupported) {
    startExperience.hidden = false;
    startExperience.addEventListener('click', () => {
      wakeLockUserGestureSeen = true;
      requestScreenWakeLock('Start button');
    });
  }

  document.addEventListener('click', handleWakeLockUserGesture, { passive: true });
  document.addEventListener('touchstart', handleWakeLockUserGesture, { passive: true });
  document.addEventListener('pointerdown', handleWakeLockUserGesture, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestScreenWakeLock('visibilitychange');
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) requestScreenWakeLock('fullscreenchange');
  });

  const wakeLockDisplayMode = window.matchMedia('(display-mode: standalone)');
  const handlePwaModeChange = () => {
    if (wakeLockDisplayMode.matches) requestScreenWakeLock('PWA mode');
  };
  if (wakeLockDisplayMode.addEventListener) wakeLockDisplayMode.addEventListener('change', handlePwaModeChange);
  else if (wakeLockDisplayMode.addListener) wakeLockDisplayMode.addListener(handlePwaModeChange);
  handlePwaModeChange();

  let dots = [];
  const dotsContainer = $('.slider-dots');

  








  const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webm'];
  const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
  const MEDIA_CACHE_VERSION = Date.now().toString(36);

  async function discoverMediaSlots() {
    const items = [];

    for (let slot = 1; slot <= 11; slot += 1) {
      const id = String(slot).padStart(3, '0');
      const foundFiles = [];

      for (const extension of MEDIA_EXTENSIONS) {
        const url = `assets/media/${id}.${extension}`;
        try {
          const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          if (!response.ok) continue;

          const contentType = (response.headers.get('content-type') || '').toLowerCase();
          const expectedType = VIDEO_EXTENSIONS.has(extension) ? 'video/' : 'image/';
          if (!contentType.startsWith(expectedType)) continue;

          foundFiles.push({
            url: `${url}?v=${MEDIA_CACHE_VERSION}`,
            type: VIDEO_EXTENSIONS.has(extension) ? 'video' : 'image'
          });
        } catch (error) {
          // A missing slot is intentionally ignored.
        }
      }

      if (foundFiles.length > 1) {
        console.warn(`Media slot ${id} has multiple files. Slot skipped:`, foundFiles);
        continue;
      }

      if (foundFiles.length === 1) {
        items.push({ id, ...foundFiles[0] });
      }
    }

    return items;
  }

  const MEDIA_ITEMS = await discoverMediaSlots();
  const SLIDE_IMAGE_URLS = MEDIA_ITEMS.filter((item) => item.type === 'image').map((item) => item.url);
  // RHYE's original displacement map used by its wavy image transitions.
  const DISPLACEMENT_IMAGE_URL = 'RHYE%20%20Template/HTML/img/general/bg-displacement-7.jpg';

  function rebuildDots(items) {
    if (!dotsContainer) return;

    dotsContainer.replaceChildren();
    items.forEach((item, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `slider__dot${index === 0 ? ' slider__dot_active' : ''}`;
      dot.setAttribute('aria-label', `Show media ${item.id}`);
      if (index === 0) dot.setAttribute('aria-current', 'true');
      dot.innerHTML = `
        <svg class="svg-circle" viewBox="0 0 152 152" aria-hidden="true">
          <path class="circle" d="M1,76a75,75 0 1,0 150,0a75,75 0 1,0 -150,0"></path>
        </svg>`;
      dotsContainer.appendChild(dot);
    });

    dots = $$('.slider__dot', dotsContainer);
  }

  rebuildDots(MEDIA_ITEMS);
  const TRANSITION_DURATION_MS = 1200;
  const TRANSITION_EASE = 'power2.inOut';
  const EFFECT_FACTOR = 0.2;

  function easePower2InOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function createDistortionSlider(items) {
    const canvas = $('#distortionCanvas');
    const container = $('.background-slider');
    if (!canvas || !container || typeof THREE === 'undefined') return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
    } catch (error) {
      console.warn('RHYE distortion could not create a WebGL renderer.', error);
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x060708, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;

    

    const fragmentShader = `
      varying vec2 vUv;
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      uniform sampler2D disp;
      uniform float dispFactor;
      uniform float effectFactor;
      uniform float texture1Aspect;
      uniform float texture2Aspect;
      uniform float planeAspect;

      vec2 getCoverUV(vec2 uv, float texAspect, float planeAspect) {
        vec2 coverUV = uv;
        if (texAspect > planeAspect) {
          float scale = planeAspect / texAspect;
          coverUV.x = (uv.x - 0.5) * scale + 0.5;
        } else {
          float scale = texAspect / planeAspect;
          coverUV.y = (uv.y - 0.5) * scale + 0.5;
        }
        return coverUV;
      }

      void main() {
        vec2 uv = vUv;
        vec4 dispTexel = texture2D(disp, uv);

        vec2 distortedPosition = vec2(uv.x + dispFactor * (dispTexel.r * effectFactor), uv.y);
        vec2 distortedPosition2 = vec2(uv.x - (1.0 - dispFactor) * (dispTexel.r * effectFactor), uv.y);

        vec2 coverUV1 = getCoverUV(distortedPosition, texture1Aspect, planeAspect);
        vec2 coverUV2 = getCoverUV(distortedPosition2, texture2Aspect, planeAspect);

        vec4 tex1 = texture2D(texture1, coverUV1);
        vec4 tex2 = texture2D(texture2, coverUV2);

        gl_FragColor = mix(tex1, tex2, dispFactor);
      }
    `;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    const dispTexture = textureLoader.load(DISPLACEMENT_IMAGE_URL);
    dispTexture.wrapS = dispTexture.wrapT = THREE.RepeatWrapping;
    dispTexture.minFilter = THREE.LinearFilter;
    dispTexture.magFilter = THREE.LinearFilter;
    dispTexture.generateMipmaps = false;

    const uniforms = {
      texture1: { value: null },
      texture2: { value: null },
      disp: { value: dispTexture },
      dispFactor: { value: 0 },
      effectFactor: { value: EFFECT_FACTOR },
      texture1Aspect: { value: 1 },
      texture2Aspect: { value: 1 },
      planeAspect: { value: 1 }
    };

    const geometry = new THREE.PlaneBufferGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function aspectOf(source) {
      const width = source?.videoWidth || source?.naturalWidth || source?.width;
      const height = source?.videoHeight || source?.naturalHeight || source?.height;
      return width && height ? width / height : 1;
    }

    function resize() {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      uniforms.planeAspect.value = width / height;
      renderOnce();
    }

    function renderOnce() {
      renderer.render(scene, camera);
    }

    const entries = items.map((item) => ({ item, texture: null, source: null, ready: false }));
    let activeIndex = 0;
    let transitioning = false;
    let animationFrame = null;

    function configureTexture(texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }

    function renderFrame() {
      animationFrame = null;
      renderOnce();
      const activeVideo = entries[activeIndex]?.source?.tagName === 'VIDEO';
      if (transitioning || activeVideo) animationFrame = requestAnimationFrame(renderFrame);
    }

    function ensureRendering() {
      if (animationFrame === null) animationFrame = requestAnimationFrame(renderFrame);
    }

    function showInitialEntry(index) {
      if (uniforms.texture1.value || !entries[index]?.ready) return;
      const entry = entries[index];
      activeIndex = index;
      uniforms.texture1.value = entry.texture;
      uniforms.texture2.value = entry.texture;
      uniforms.texture1Aspect.value = aspectOf(entry.source);
      uniforms.texture2Aspect.value = aspectOf(entry.source);
      if (entry.source?.tagName === 'VIDEO') entry.source.play().catch(() => {});
      resize();
      ensureRendering();
    }

    entries.forEach((entry, index) => {
      if (entry.item.type === 'video') {
        const video = document.createElement('video');
        video.className = 'rhye-texture-video';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.addEventListener('loadeddata', () => {
          entry.source = video;
          entry.texture = configureTexture(new THREE.VideoTexture(video));
          entry.ready = true;
          showInitialEntry(index);
        }, { once: true });
        video.addEventListener('error', () => {
          entry.item.failed = true;
        }, { once: true });
        video.src = entry.item.url;
        container.appendChild(video);
        video.load();
      } else {
        textureLoader.load(entry.item.url, (texture) => {
          entry.source = texture.image;
          entry.texture = configureTexture(texture);
          entry.ready = true;
          showInitialEntry(index);
        }, undefined, () => {
          entry.item.failed = true;
        });
      }
    });

    window.addEventListener('resize', resize);

    function goTo(nextIndex, onComplete) {
      const nextEntry = entries[nextIndex];
      if (transitioning || nextIndex === activeIndex || !nextEntry?.ready || !uniforms.texture1.value) return false;
      transitioning = true;

      const previousEntry = entries[activeIndex];
      if (nextEntry.source?.tagName === 'VIDEO') {
        nextEntry.source.currentTime = 0;
        nextEntry.source.play().catch(() => {});
      }

      uniforms.texture2.value = nextEntry.texture;
      uniforms.texture2Aspect.value = aspectOf(nextEntry.source);
      uniforms.dispFactor.value = 0;
      canvas.style.transition = `transform ${TRANSITION_DURATION_MS}ms cubic-bezier(.22,.61,.36,1)`;
      canvas.style.transform = 'scale(1.05)';
      ensureRendering();

      const finish = () => {
        if (previousEntry.source?.tagName === 'VIDEO') {
          previousEntry.source.pause();
          previousEntry.source.currentTime = 0;
        }
        uniforms.texture1.value = nextEntry.texture;
        uniforms.texture1Aspect.value = aspectOf(nextEntry.source);
        uniforms.dispFactor.value = 0;
        activeIndex = nextIndex;
        transitioning = false;
        canvas.style.transitionDuration = `${TRANSITION_DURATION_MS * 2}ms`;
        canvas.style.transform = 'scale(1)';
        renderOnce();
        ensureRendering();
        if (typeof onComplete === 'function') onComplete(nextIndex);
      };

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
        return;
      }

      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / TRANSITION_DURATION_MS);
        uniforms.dispFactor.value = easePower2InOut(t);
        if (t < 1) requestAnimationFrame(tick);
        else finish();
      }
      requestAnimationFrame(tick);
      return true;
    }

    return {
      goTo,
      get activeIndex() { return activeIndex; },
      get slideCount() { return items.length; },
      get isTransitioning() { return transitioning; }
    };
  }

  function createMediaSlider(items) {
    const container = $('.background-slider');
    const overlay = $('.image-overlay');
    if (!container || !overlay || !items.length) return null;

    let activeIndex = 0;
    let activeLayerIndex = 0;
    let transitionToken = 0;
    let transitionTimer = null;
    let transitioning = false;
    let liquidAnimationFrame = null;

    const liquidTurbulence = $('#liquid-turbulence');
    const stopLiquidMotion = () => {
      if (liquidAnimationFrame !== null) {
        cancelAnimationFrame(liquidAnimationFrame);
        liquidAnimationFrame = null;
      }
      liquidTurbulence?.setAttribute('baseFrequency', '0.009 0.055');
    };
    const startLiquidMotion = () => {
      if (!liquidTurbulence) return;
      stopLiquidMotion();
      const startedAt = performance.now();
      const animateLiquidMotion = (now) => {
        const elapsed = now - startedAt;
        const progress = Math.min(1, elapsed / TRANSITION_DURATION_MS);
        const wave = Math.sin(progress * Math.PI);
        const frequencyX = 0.009 + wave * 0.036;
        const frequencyY = 0.055 - wave * 0.046;
        liquidTurbulence.setAttribute('baseFrequency', `${frequencyX.toFixed(4)} ${frequencyY.toFixed(4)}`);
        if (progress < 1) liquidAnimationFrame = requestAnimationFrame(animateLiquidMotion);
        else stopLiquidMotion();
      };
      liquidAnimationFrame = requestAnimationFrame(animateLiquidMotion);
    };

    const layers = [
      { root: document.createElement('div'), media: null, itemIndex: -1 },
      { root: document.createElement('div'), media: null, itemIndex: -1 }
    ];

    layers.forEach((layer, index) => {
      layer.root.className = `media-layer media-layer-${index === 0 ? 'a' : 'b'}`;
      container.insertBefore(layer.root, overlay);
    });

    const createMediaElement = (item) => {
      const element = document.createElement(item.type === 'video' ? 'video' : 'img');
      element.className = 'media-background';
      element.setAttribute('aria-hidden', 'true');

      if (item.type === 'video') {
        element.muted = true;
        element.autoplay = false;
        element.loop = true;
        element.playsInline = true;
        element.preload = 'auto';
        element.setAttribute('muted', '');
        element.setAttribute('playsinline', '');
        element.setAttribute('preload', 'auto');
      } else {
        element.alt = '';
        element.decoding = 'async';
      }

      element.src = item.url;
      return element;
    };

    const clearLayer = (layer) => {
      if (layer.media?.tagName === 'VIDEO') {
        layer.media.pause();
        layer.media.currentTime = 0;
      }
      layer.root.replaceChildren();
      layer.media = null;
      layer.itemIndex = -1;
      layer.root.classList.remove('is-active');
      layer.root.style.visibility = 'hidden';
    };

    const findNextValidIndex = (fromIndex) => {
      for (let offset = 1; offset <= items.length; offset += 1) {
        const index = (fromIndex + offset) % items.length;
        if (!items[index].failed) return index;
      }
      return -1;
    };

    const loadIntoLayer = (layer, index, onReady, onError) => {
      const item = items[index];
      clearLayer(layer);
      const media = createMediaElement(item);
      layer.media = media;
      layer.itemIndex = index;
      layer.root.appendChild(media);

      let readyCalled = false;
      const ready = async () => {
        if (readyCalled) return;
        readyCalled = true;
        if (item.type === 'image' && typeof media.decode === 'function') {
          try {
            await media.decode();
          } catch (error) {
            // The loaded image is still usable if decode is unavailable or fails.
          }
        }
        onReady(media);
      };
      const failed = () => {
        if (readyCalled) return;
        item.failed = true;
        clearLayer(layer);
        if (typeof onError === 'function') onError();
      };

      if (item.type === 'video') {
        const videoReadyEvents = new Set();
        const markVideoReady = (event) => {
          videoReadyEvents.add(event.type);
          if (['loadedmetadata', 'loadeddata', 'canplay'].every((name) => videoReadyEvents.has(name))) ready();
        };
        media.addEventListener('loadedmetadata', markVideoReady);
        media.addEventListener('loadeddata', markVideoReady);
        media.addEventListener('canplay', markVideoReady);
      } else {
        media.addEventListener('load', ready, { once: true });
      }
      media.addEventListener('error', failed, { once: true });

      if (item.type === 'video') media.load();
      if (item.type === 'image' && media.complete) {
        if (media.naturalWidth > 0) ready();
        else failed();
      }
    };

    const playLayerVideo = (layer) => {
      if (layer.media?.tagName !== 'VIDEO') return Promise.resolve();
      layer.media.currentTime = 0;
      return layer.media.play().catch(() => {});
    };

    const preloadNext = () => {
      const nextIndex = findNextValidIndex(activeIndex);
      if (nextIndex < 0) return;
      const hiddenLayer = layers[1 - activeLayerIndex];
      if (hiddenLayer.itemIndex === nextIndex) return;
      loadIntoLayer(hiddenLayer, nextIndex, () => {}, () => {
        preloadNext();
      });
    };

    const showInitialMedia = () => {
      loadIntoLayer(layers[0], 0, () => {
        layers[0].root.style.visibility = 'visible';
        layers[0].root.classList.add('is-active');
        playLayerVideo(layers[0]);
        preloadNext();
      }, () => {
        const nextIndex = findNextValidIndex(0);
        if (nextIndex >= 0) showMedia(nextIndex);
      });
    };

    const showMedia = (index, onComplete) => {
      if (transitioning || index < 0 || index >= items.length || items[index].failed) return false;
      const targetLayerIndex = 1 - activeLayerIndex;
      const targetLayer = layers[targetLayerIndex];
      const token = ++transitionToken;

      const activate = () => {
        if (token !== transitionToken) return;
        const previousLayer = layers[activeLayerIndex];
        transitioning = true;

        if (transitionTimer !== null) {
          window.clearTimeout(transitionTimer);
          transitionTimer = null;
        }

        previousLayer.root.classList.add('liquid-out');
        targetLayer.root.classList.add('liquid-in');
        targetLayer.root.style.visibility = 'visible';
        startLiquidMotion();

        // Start the CSS liquid motion only after the preloaded layer is visible.
        requestAnimationFrame(() => {
          if (token !== transitionToken) return;
          previousLayer.root.classList.remove('is-active');
          targetLayer.root.classList.add('is-active');
        });
        transitionTimer = window.setTimeout(() => {
          stopLiquidMotion();
          if (previousLayer.media?.tagName === 'VIDEO') {
            previousLayer.media.pause();
            previousLayer.media.currentTime = 0;
          }
          previousLayer.root.replaceChildren();
          previousLayer.media = null;
          previousLayer.itemIndex = -1;
          previousLayer.root.classList.remove('liquid-out', 'liquid-in');
          previousLayer.root.style.visibility = 'hidden';
          targetLayer.root.classList.remove('liquid-out', 'liquid-in');
          activeLayerIndex = targetLayerIndex;
          activeIndex = index;
          transitioning = false;
          transitionTimer = null;
          preloadNext();
          if (typeof onComplete === 'function') onComplete(index);
        }, TRANSITION_DURATION_MS);
      };

      const activateWhenPlaying = () => {
        playLayerVideo(targetLayer).then(activate);
      };

      if (targetLayer.itemIndex === index && targetLayer.media) {
        activateWhenPlaying();
      } else {
        loadIntoLayer(targetLayer, index, activateWhenPlaying, () => {
          const nextIndex = findNextValidIndex(index - 1);
          if (nextIndex >= 0 && nextIndex !== index) showMedia(nextIndex, onComplete);
        });
      }
      return true;
    };

    showInitialMedia();

    return {
      goTo(nextIndex, onComplete) {
        if (nextIndex < 0 || nextIndex >= items.length || nextIndex === activeIndex || items[nextIndex].failed) return false;
        return showMedia(nextIndex, onComplete);
      },
      get activeIndex() { return activeIndex; },
      get slideCount() { return items.length; },
      get isTransitioning() { return transitioning; }
    };
  }

  const canUseRhyeDistortion = MEDIA_ITEMS.length > 1 && typeof THREE === 'object';
  const rhyeDistortionSlider = canUseRhyeDistortion ? createDistortionSlider(MEDIA_ITEMS) : null;
  document.body.classList.toggle('uses-rhye-distortion', Boolean(rhyeDistortionSlider));
  const distortionSlider = rhyeDistortionSlider || createMediaSlider(MEDIA_ITEMS);
  const RHYE_AUTOPLAY_MS = 11000;
  const RHYE_DELAY_SECONDS = RHYE_AUTOPLAY_MS / 1000;
  let logicalSlideIndex = 0;
  let retryTimer = null;

   
   
   
  const rhyeDotCircles = dots.map((dot) => dot.querySelector('.circle')).filter(Boolean);
  const rhyeDotTimeline = window.gsap ? new gsap.timeline() : null;
  const rhyeInitialDotTimeline = window.gsap ? new gsap.timeline() : null;

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function updateDots(index) {
    dots.forEach((dot, i) => {
      const selected = i === index;
      dot.classList.toggle('slider__dot_active', selected);
      if (selected) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function startInitialRhyeDot() {
    if (!window.gsap || !rhyeInitialDotTimeline || !rhyeDotCircles.length) return;

    gsap.set(rhyeDotCircles, {
      strokeOpacity: 0,
      transformOrigin: 'center center',
      rotate: 180,
      drawSVG: '100% 100%'
    });

    const currentCircle = dots[0] && dots[0].querySelector('.circle');
    if (!currentCircle) return;

     
     
     
    rhyeInitialDotTimeline.fromTo(currentCircle, {
      strokeOpacity: 1,
      rotate: 0,
      transformOrigin: 'center center',
      drawSVG: '100% 100%',
      ease: 'power3.inOut'
    }, {
      strokeOpacity: 1,
      rotate: 180,
      transformOrigin: 'center center',
      duration: RHYE_DELAY_SECONDS,
      drawSVG: '0% 100%',
      onComplete: advanceToNextSlide
    });
  }

  function setCurrentRhyeDot(index = 0) {
    if (!window.gsap || !rhyeDotTimeline || !rhyeDotCircles.length) return;

    const currentDot = dots[index];
    const currentCircle = currentDot && currentDot.querySelector('.circle');
    if (!currentCircle) return;
    const otherCircles = rhyeDotCircles.filter((circle) => circle !== currentCircle);

    gsap.set(rhyeDotCircles, {
      strokeOpacity: 0,
      rotate: 0,
      transformOrigin: 'center center',
      drawSVG: '0% 0%'
    });

    
     
     
     
     
     
     
    rhyeDotTimeline
      .clear()
      .add(() => {
        if (rhyeInitialDotTimeline) rhyeInitialDotTimeline.kill();
      })
      .to(otherCircles, {
        duration: RHYE_DELAY_SECONDS / 10,
        transformOrigin: 'center center',
        drawSVG: '0% 0%',
        ease: 'expo.inOut'
      })
      .set(otherCircles, {
        strokeOpacity: 0
      })
      .fromTo(currentCircle, {
        strokeOpacity: 1,
        rotate: 0,
        transformOrigin: 'center center',
        drawSVG: '100% 100%',
        ease: 'power3.inOut'
      }, {
        strokeOpacity: 1,
        rotate: 180,
        transformOrigin: 'center center',
        duration: RHYE_DELAY_SECONDS,
        drawSVG: '0% 100%',
        onComplete: advanceToNextSlide
      });
  }

  function transitionToSlide(index, retryOnFailure = true) {
    if (!distortionSlider) return;
    clearRetryTimer();

    if (distortionSlider.isTransitioning) return;

    if (index === logicalSlideIndex && distortionSlider.activeIndex === index) return;

    const started = distortionSlider.goTo(index, (resolvedIndex) => {
      logicalSlideIndex = resolvedIndex;
      updateDots(logicalSlideIndex);
      setCurrentRhyeDot(logicalSlideIndex);
    });
    if (started === false) {
      if (retryOnFailure) {
        retryTimer = setTimeout(() => transitionToSlide(index, true), 120);
      }
      return;
    }

  }

  function advanceToNextSlide() {
    if (!distortionSlider) return;
    const nextIndex = (logicalSlideIndex + 1) % distortionSlider.slideCount;
    transitionToSlide(nextIndex, true);
  }

  if (distortionSlider && window.gsap) {
    updateDots(logicalSlideIndex);
    startInitialRhyeDot();

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        if (index === logicalSlideIndex) return;
        transitionToSlide(index, false);
      });
    });

     
     
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearRetryTimer();
        if (rhyeDotTimeline) rhyeDotTimeline.pause();
        if (rhyeInitialDotTimeline) rhyeInitialDotTimeline.pause();
      } else {
        if (rhyeDotTimeline && rhyeDotTimeline.totalDuration()) rhyeDotTimeline.play();
        else if (rhyeInitialDotTimeline) rhyeInitialDotTimeline.play();
      }
    });
  }



  




  const rhyeCursor = $('#rhyeCursor');
  if (rhyeCursor && window.matchMedia('(pointer:fine) and (hover:hover)').matches) {
    let targetX = -100;
    let targetY = -100;
    let cursorX = -100;
    let cursorY = -100;
    let magneticDot = null;
    const rhyeCursorSvg = $('.rhye-cursor-svg', rhyeCursor);

    const scaleFollower = (scale) => {
      if (!rhyeCursorSvg) return;
      if (window.gsap) {
        gsap.to(rhyeCursorSvg, {
          duration: .2,
          scale,
          transformOrigin: '50% 50%',
          overwrite: 'auto'
        });
      } else {
        rhyeCursorSvg.style.transformOrigin = '50% 50%';
        rhyeCursorSvg.style.transform = `scale(${scale})`;
      }
    };

    const resetMagneticDot = (dot, event) => {
      if (!dot) return;
      dot.classList.remove('rhye-dot-magnetic');
      if (window.gsap) {
        gsap.to(dot, {
          duration: .4,
          x: 0,
          y: 0,
          overwrite: 'auto'
        });
      } else {
        dot.style.transform = '';
      }
      magneticDot = null;
      scaleFollower(1);
      if (event) {
        targetX = event.clientX;
        targetY = event.clientY;
      }
    };

    const renderCursor = () => {
      cursorX += (targetX - cursorX) * .18;
      cursorY += (targetY - cursorY) * .18;
      rhyeCursor.style.transform =
        `translate3d(${cursorX - rhyeCursor.offsetWidth / 2}px, ${cursorY - rhyeCursor.offsetHeight / 2}px, 0)`;
      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);

    dots.forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        magneticDot = dot;
        dot.classList.add('rhye-dot-magnetic');
        scaleFollower(.5);
      });

      dot.addEventListener('mousemove', (event) => {
        magneticDot = dot;
        const rect = dot.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = Math.floor(centerX - event.clientX) * -.5;
        const deltaY = Math.floor(centerY - event.clientY) * -.5;

         
         
        targetX = centerX;
        targetY = centerY;
        scaleFollower(.5);

        if (window.gsap) {
          gsap.to(dot, {
            duration: .2,
            x: deltaX,
            y: deltaY,
            overwrite: 'auto'
          });
        } else {
          dot.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }
      });

      dot.addEventListener('mouseleave', (event) => {
        resetMagneticDot(dot, event);
      });
    });

    document.addEventListener('mousemove', (event) => {
       
       
      if (!magneticDot) {
        targetX = event.clientX;
        targetY = event.clientY;
      }
      rhyeCursor.classList.add('is-visible');

      const interactive = event.target.closest(
        'a,button,input,select,label,[role="button"],.slider__dot'
      );
      rhyeCursor.classList.toggle('is-interactive', Boolean(interactive));

      const lightSurface = event.target.closest(
        '.booking-shell,.confirmation-card,.contact-menu,.geoapify-suggestions'
      );
      rhyeCursor.classList.toggle('is-on-light', Boolean(lightSurface));
    });

    document.addEventListener('mouseleave', () => {
      if (magneticDot) resetMagneticDot(magneticDot);
      rhyeCursor.classList.remove('is-visible');
    });

    document.addEventListener('mousedown', () => {
      rhyeCursor.classList.add('is-clicking');
    });

    document.addEventListener('mouseup', () => {
      rhyeCursor.classList.remove('is-clicking');
    });
  }

  function positionDesktopSliderDots() {
    const sliderDots = $('.slider-dots');
    const trustRating = $('.trust-rating');
    const rideTabs = $('.ride-tabs');
    const heroCopy = $('.hero-copy');
    const bookingShell = $('.booking-shell');
    if (!sliderDots || !heroCopy || !bookingShell) return;

     
     
     
     
     
    const dotsAbsolutelyPositioned = getComputedStyle(sliderDots).position === 'absolute';

    if (!dotsAbsolutelyPositioned) {
      sliderDots.style.removeProperty('top');
      sliderDots.style.removeProperty('bottom');
      trustRating?.style.removeProperty('top');
      trustRating?.style.removeProperty('bottom');
      trustRating?.style.removeProperty('right');
      return;
    }

    const heroBottom = heroCopy.getBoundingClientRect().bottom;
    const bookingRect = bookingShell.getBoundingClientRect();
    const bookingTop = bookingRect.top;
    const sliderHeight = sliderDots.getBoundingClientRect().height;
    const desktopFooter = $('.desktop-footer');
    const isDesktopFullscreen = window.matchMedia('(min-width:700px) and (pointer:fine) and (orientation:landscape)').matches;
    const isIpadDesktopReplica = window.matchMedia('(min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)').matches;

    let positionedTop;

    if ((isDesktopFullscreen || isIpadDesktopReplica) && desktopFooter && getComputedStyle(desktopFooter).display !== 'none') {
       
       
       
      const footerRect = desktopFooter.getBoundingClientRect();
      const lowerGap = Math.max(18, footerRect.top - bookingRect.bottom);
      positionedTop = bookingTop - sliderHeight - lowerGap;

       
       
       
      if (isIpadDesktopReplica) {
        const topClearance = 14;
        const bottomClearance = 14;
        const bandTop = heroBottom + topClearance;
        const bandBottom = bookingTop - bottomClearance;
        const centeredTop = heroBottom + (bookingTop - heroBottom - sliderHeight) / 2;
        positionedTop = Math.max(bandTop, Math.min(centeredTop, bandBottom - sliderHeight));
      } else {
        positionedTop = Math.max(heroBottom + 14, positionedTop);
      }
    } else {
      const availableHeight = bookingTop - heroBottom;
      positionedTop = heroBottom + Math.max(0, (availableHeight - sliderHeight) / 2);
    }

    sliderDots.style.setProperty('top', `${positionedTop}px`, 'important');
    sliderDots.style.setProperty('bottom', 'auto', 'important');

     
     
     
    const ratingVisible = trustRating && getComputedStyle(trustRating).display !== 'none';
    if (ratingVisible) {
      const trustStars = $('.trust-stars', trustRating);
      const ratingRect = trustRating.getBoundingClientRect();
      const dotCenterY = positionedTop + sliderHeight / 2;

      if (trustStars) {
        const starsRect = trustStars.getBoundingClientRect();
        const starsCenterOffset = (starsRect.top + starsRect.height / 2) - ratingRect.top;
        const ratingTop = dotCenterY - starsCenterOffset;
        trustRating.style.setProperty('top', `${ratingTop}px`, 'important');
      } else {
        const ratingTop = dotCenterY - ratingRect.height / 2;
        trustRating.style.setProperty('top', `${ratingTop}px`, 'important');
      }
      trustRating.style.setProperty('bottom', 'auto', 'important');

       
       
      if (rideTabs) {
        const stage = $('.stage');
        const tabsRect = rideTabs.getBoundingClientRect();
        const stageRect = stage?.getBoundingClientRect();
        if (stageRect) {
          const ratingRight = Math.max(0, stageRect.right - tabsRect.right);
          trustRating.style.setProperty('right', `${ratingRight}px`, 'important');
        }
      }
    }
  }

  requestAnimationFrame(positionDesktopSliderDots);
  window.addEventListener('resize', positionDesktopSliderDots);
  document.fonts?.ready.then(positionDesktopSliderDots);

  const contactMenuButton = $('#contactMenuButton');
  const contactMenu = $('#contactMenu');

  function closeContactMenu() {
    if (!contactMenu || !contactMenuButton) return;
    contactMenu.hidden = true;
    contactMenuButton.setAttribute('aria-expanded', 'false');
  }

  contactMenuButton?.addEventListener('click', (event) => {
    event.preventDefault();
    const willOpen = contactMenu.hidden;
    closeContactMenu();
    contactMenu.hidden = !willOpen;
    contactMenuButton.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.contact-menu-wrap')) closeContactMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeContactMenu();
  });

  const clockDate = $('#clockDate');
  const clockTime = $('#clockTime');
  const clockTimeMain = $('#clockTimeMain');
  const clockPeriod = $('#clockPeriod');
  const clockLocation = $('#clockLocation');
  const weatherTemp = $('#weatherTemp');
  const weatherCondition = $('#weatherCondition');
  const weatherEmoji = $('#weatherEmoji');
  const weatherHighLow = $('#weatherHighLow');
  const weatherMain = $('.weather-main');
  const WEATHER_CACHE_KEY = 'drivista:last-successful-weather';
  let weatherTimezone = CONFIG.fallbackTimezone;
  let hasWeatherData = false;
  let activeCoordinates = {
    latitude: CONFIG.fallbackLatitude,
    longitude: CONFIG.fallbackLongitude
  };

  function updateClock() {
    const now = new Date();

    clockDate.textContent = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: weatherTimezone
    }).format(now);

    const timeParts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: weatherTimezone
    }).formatToParts(now);

    const hour = timeParts.find((part) => part.type === 'hour')?.value || '';
    const minute = timeParts.find((part) => part.type === 'minute')?.value || '';
    const period = timeParts.find((part) => part.type === 'dayPeriod')?.value || '';

    clockTimeMain.textContent = `${hour}:${minute}`;
    clockPeriod.textContent = period;
  }

  updateClock();
  setInterval(updateClock, 1000);

  clockLocation.textContent = CONFIG.defaultLocation;

  function weatherCodeLabel(code) {
    if (code === 0) return 'Clear';
    if ([1, 2].includes(code)) return 'Partly cloudy';
    if (code === 3) return 'Cloudy';
    if ([45, 48].includes(code)) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorms';
    return 'Current weather';
  }

  function weatherCodeEmoji(code) {
    if (code === 0) return '☀️';
    if ([1, 2].includes(code)) return '🌤️';
    if (code === 3) return '☁️';
    if ([45, 48].includes(code)) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '☁️';
  }

  function setWeatherFallback() {
    weatherTemp.innerHTML = '--<span>°</span>';
    weatherEmoji.textContent = '☁️';
    weatherCondition.textContent = 'Weather unavailable';
    weatherHighLow.textContent = 'H:--°F · L:--°F';
  }

  function renderWeather(data) {
    const currentTemp = Number.isFinite(data.currentTemp) ? Math.round(data.currentTemp) : NaN;
    const high = Number.isFinite(data.high) ? Math.round(data.high) : NaN;
    const low = Number.isFinite(data.low) ? Math.round(data.low) : NaN;

    weatherTemp.innerHTML = `${currentTemp}<span>°</span>`;
    weatherEmoji.textContent = weatherCodeEmoji(data.code);
    weatherCondition.textContent = weatherCodeLabel(data.code);
    weatherHighLow.textContent =
      Number.isFinite(high) && Number.isFinite(low)
        ? `H:${high}°F · L:${low}°F`
        : 'Today';
    hasWeatherData = true;
  }

  function loadCachedWeather() {
    try {
      const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
      if (!cached || !Number.isFinite(cached.currentTemp)) return false;
      if (typeof cached.timezone === 'string' && cached.timezone.trim()) {
        weatherTimezone = cached.timezone;
        updateClock();
      }
      renderWeather(cached);
      return true;
    } catch (error) {
      console.warn('Cached weather could not be used.', error);
      return false;
    }
  }

  function cacheWeather(data) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Weather could not be cached.', error);
    }
  }

  async function updateWeather(latitude, longitude) {
    weatherMain.classList.add('is-loading');
    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min',
        temperature_unit: 'fahrenheit',
        timezone: 'auto',
        forecast_days: '1'
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}`);

      const data = await response.json();
      if (typeof data.timezone === 'string' && data.timezone.trim()) {
        weatherTimezone = data.timezone;
        updateClock();
      }
      const currentTemp = Math.round(data.current?.temperature_2m);
      const high = Math.round(data.daily?.temperature_2m_max?.[0]);
      const low = Math.round(data.daily?.temperature_2m_min?.[0]);
      const code = data.current?.weather_code;

      if (!Number.isFinite(currentTemp)) throw new Error('Weather temperature missing.');

      renderWeather({ currentTemp, high, low, code, timezone: data.timezone });
      cacheWeather({ currentTemp, high, low, code, timezone: data.timezone });
    } catch (error) {
      console.warn('Weather could not be loaded.', error);
      if (!hasWeatherData) setWeatherFallback();
    } finally {
      weatherMain.classList.remove('is-loading');
    }
  }

  async function updateLocationName(latitude, longitude) {
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        apiKey: CONFIG.geoapifyApiKey
      });
      const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`);
      if (!response.ok) throw new Error(`Reverse geocoding returned ${response.status}`);

      const data = await response.json();
      const properties = data.features?.[0]?.properties || {};
      const locationName = properties.suburb || properties.neighbourhood || properties.district ||
        properties.city || properties.town || properties.village || properties.municipality ||
        properties.county || properties.state;

      if (typeof locationName === 'string' && locationName.trim()) {
        clockLocation.textContent = locationName.trim();
      }
    } catch (error) {
      console.warn('Location name could not be loaded.', error);
      clockLocation.textContent = CONFIG.defaultLocation;
    }
  }

  async function useFallbackLocation() {
    activeCoordinates = {
      latitude: CONFIG.fallbackLatitude,
      longitude: CONFIG.fallbackLongitude
    };
    weatherTimezone = CONFIG.fallbackTimezone;
    clockLocation.textContent = CONFIG.defaultLocation;
    await updateWeather(activeCoordinates.latitude, activeCoordinates.longitude);
  }

  function requestDeviceLocation() {
    if (!navigator.geolocation) {
      useFallbackLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      console.info('Device location received.', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      });
      activeCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await Promise.all([
        updateWeather(activeCoordinates.latitude, activeCoordinates.longitude),
        updateLocationName(activeCoordinates.latitude, activeCoordinates.longitude)
      ]);
    }, () => {
      useFallbackLocation();
    }, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    });
  }

  clockLocation.textContent = CONFIG.defaultLocation;
  loadCachedWeather();
  updateWeather(CONFIG.fallbackLatitude, CONFIG.fallbackLongitude);
  requestDeviceLocation();

  window.setInterval(() => {
    updateWeather(activeCoordinates.latitude, activeCoordinates.longitude);
  }, 10 * 60 * 1000);

  window.setInterval(() => {
    requestDeviceLocation();
  }, 15 * 60 * 1000);


  




  const MAJOR_AIRPORTS = {
    MIA: 'Miami International Airport, Miami, FL',
    FLL: 'Fort Lauderdale-Hollywood International Airport, Fort Lauderdale, FL',
    PBI: 'Palm Beach International Airport, West Palm Beach, FL',
    RSW: 'Southwest Florida International Airport, Fort Myers, FL',
    TPA: 'Tampa International Airport, Tampa, FL',
    MCO: 'Orlando International Airport, Orlando, FL',
    JAX: 'Jacksonville International Airport, Jacksonville, FL',
    ATL: 'Hartsfield-Jackson Atlanta International Airport, Atlanta, GA',
    CLT: 'Charlotte Douglas International Airport, Charlotte, NC',
    RDU: 'Raleigh-Durham International Airport, Raleigh, NC',
    CHS: 'Charleston International Airport, Charleston, SC',
    MYR: 'Myrtle Beach International Airport, Myrtle Beach, SC',
    JFK: 'John F. Kennedy International Airport, New York, NY',
    LGA: 'LaGuardia Airport, New York, NY',
    EWR: 'Newark Liberty International Airport, Newark, NJ',
    LAX: 'Los Angeles International Airport, Los Angeles, CA',
    SFO: 'San Francisco International Airport, San Francisco, CA',
    SEA: 'Seattle-Tacoma International Airport, Seattle, WA',
    SAN: 'San Diego International Airport, San Diego, CA',
    LAS: 'Harry Reid International Airport, Las Vegas, NV',
    PDX: 'Portland International Airport, Portland, OR'
  };

  function resolveAirportQuery(rawQuery) {
    const upper = rawQuery.trim().toUpperCase();

     
    const bareCode = upper.match(/^([A-Z]{3})$/);
    if (bareCode && MAJOR_AIRPORTS[bareCode[1]]) return MAJOR_AIRPORTS[bareCode[1]];

     
    const codeWithAirport = upper.match(/^([A-Z]{3})\s+AIRPORT$/) || upper.match(/^AIRPORT\s+([A-Z]{3})$/);
    if (codeWithAirport && MAJOR_AIRPORTS[codeWithAirport[1]]) return MAJOR_AIRPORTS[codeWithAirport[1]];

    return null;
  }

  function boostAirportResults(list, rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    const looksLikeAirportSearch = query.includes('airport') || /^[a-z]{3}$/.test(query);
    if (!looksLikeAirportSearch) return list;

    return [...list].sort((a, b) => {
      const aIsMajor = /international airport|intl airport/i.test(a.formatted || '') ? 0 : 1;
      const bIsMajor = /international airport|intl airport/i.test(b.formatted || '') ? 0 : 1;
      return aIsMajor - bIsMajor;
    });
  }

  function setupGeoapifyAddressAutocomplete() {
    const key = CONFIG.geoapifyApiKey;
    if (!key) return;

    ['pickup', 'dropoff'].forEach((id) => {
      const input = document.getElementById(id);
      const wrap = input?.closest('.input-wrap');
      if (!input || !wrap || input.dataset.geoapifyReady === 'true') return;

      input.dataset.geoapifyReady = 'true';
      input.classList.add('geoapify-address-input');
      wrap.classList.add('geoapify-wrap');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');

      const menu = document.createElement('div');
      menu.className = 'geoapify-suggestions';
      menu.hidden = true;
      menu.setAttribute('role', 'listbox');
      menu.id = `${id}-address-suggestions`;
      input.setAttribute('aria-controls', menu.id);
      document.body.appendChild(menu);

      function getViewportMetrics() {
        if (window.visualViewport) {
          return {
            height: window.visualViewport.height,
            offsetTop: window.visualViewport.offsetTop
          };
        }
        return { height: window.innerHeight, offsetTop: 0 };
      }

      function isIPadLikeDevice() {
        return /iPad/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      }

      function positionSuggestions() {
         
         
         
        const rect = input.getBoundingClientRect();
        const vv = window.visualViewport;
        const viewportTop = vv ? vv.offsetTop : 0;
        const viewportHeight = vv ? vv.height : window.innerHeight;
        const viewportBottom = viewportTop + viewportHeight;
        const isIPad = isIPadLikeDevice();

        menu.style.position = 'fixed';
        menu.style.zIndex = '2147483647';
        menu.style.left = `${Math.max(8, rect.left)}px`;
        menu.style.width = `${Math.max(220, rect.width)}px`;
        menu.style.right = 'auto';
        menu.style.bottom = 'auto';

        if (isIPad) {
           
           
           
          const gap = 8;
          const availableAbove = Math.max(90, rect.top - viewportTop - gap - 8);
          const maxHeight = Math.min(220, availableAbove);
          menu.style.maxHeight = `${maxHeight}px`;

           
          const measured = Math.min(menu.scrollHeight || maxHeight, maxHeight);
          let top = rect.top - measured - gap;
          top = Math.max(viewportTop + 8, top);
          menu.style.top = `${top}px`;
        } else {
          const spaceBelow = viewportBottom - rect.bottom;
          const spaceAbove = rect.top - viewportTop;
          const maxHeight = Math.min(320, viewportHeight * 0.45);
          if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
            menu.style.top = `${rect.bottom + 8}px`;
            menu.style.maxHeight = `${Math.max(120, Math.min(maxHeight, spaceBelow - 16))}px`;
          } else {
            const h = Math.max(96, Math.min(maxHeight, spaceAbove - 16));
            const measured = Math.min(menu.scrollHeight || h, h);
            menu.style.top = `${Math.max(viewportTop + 8, rect.top - measured - 8)}px`;
            menu.style.maxHeight = `${h}px`;
          }
        }
      }

      window.addEventListener('resize', () => {
        if (!menu.hidden) positionSuggestions();
      });
      window.addEventListener('scroll', () => {
        if (!menu.hidden) positionSuggestions();
      }, { passive: true, capture: true });
       
       
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          if (!menu.hidden) positionSuggestions();
        });
        window.visualViewport.addEventListener('scroll', () => {
          if (!menu.hidden) positionSuggestions();
        });
      }

      let debounceTimer;
      let requestController;
      let results = [];
      let activeIndex = -1;
      let selectingSuggestion = false;

      function closeSuggestions() {
        menu.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        activeIndex = -1;
      }

      function chooseSuggestion(result) {
        input.value = result.formatted || [result.address_line1, result.address_line2].filter(Boolean).join(', ');
        input.dataset.latitude = result.lat ?? '';
        input.dataset.longitude = result.lon ?? '';
        input.dataset.placeId = result.place_id ?? '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        closeSuggestions();
      }

      function setActiveSuggestion(index) {
        const buttons = $$('.geoapify-suggestion', menu);
        if (!buttons.length) return;
        activeIndex = (index + buttons.length) % buttons.length;
        buttons.forEach((button, buttonIndex) => button.classList.toggle('is-active', buttonIndex === activeIndex));
        input.setAttribute('aria-activedescendant', buttons[activeIndex].id);
        buttons[activeIndex].scrollIntoView({ block: 'nearest' });
      }

      function renderSuggestions(nextResults, rawQuery) {
        results = boostAirportResults(nextResults, rawQuery || '');
        activeIndex = -1;
        menu.replaceChildren();

        results.forEach((result, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'geoapify-suggestion';
          button.id = `${id}-address-option-${index}`;
          button.setAttribute('role', 'option');
          const label = document.createElement('strong');
          label.textContent = result.formatted || [result.address_line1, result.address_line2].filter(Boolean).join(', ');
          button.appendChild(label);
           
           
           
           
          button.dataset.suggestionIndex = String(index);
          let touchStartX = 0;
          let touchStartY = 0;
          let touchMoved = false;

          button.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            if (!touch) return;
            selectingSuggestion = true;  
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
          }, { capture: true, passive: true });

          button.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            if (!touch) return;
            if (Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) {
              touchMoved = true;
            }
          }, { capture: true, passive: true });

          button.addEventListener('touchend', (event) => {
            if (!touchMoved && !menu.hidden) {
              event.preventDefault();
              event.stopPropagation();
              chooseSuggestion(result);
            }
            setTimeout(() => { selectingSuggestion = false; }, 220);
          }, { capture: true, passive: false });

          button.addEventListener('touchcancel', () => {
            touchMoved = true;
            setTimeout(() => { selectingSuggestion = false; }, 50);
          }, { capture: true, passive: true });

          button.addEventListener('pointerdown', (event) => {
             
             
            if (event.pointerType === 'touch') return;
            event.preventDefault();
            selectingSuggestion = true;
            chooseSuggestion(result);
            setTimeout(() => { selectingSuggestion = false; }, 220);
          }, { capture: true });

          button.addEventListener('mousedown', (event) => event.preventDefault(), { capture: true });
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!menu.hidden && !touchMoved) chooseSuggestion(result);
            selectingSuggestion = false;
          });
          menu.appendChild(button);
        });

        const attribution = document.createElement('div');
        attribution.className = 'geoapify-attribution';
        attribution.innerHTML = 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a>';
        menu.appendChild(attribution);
        menu.hidden = results.length === 0;
        input.setAttribute('aria-expanded', String(results.length > 0));
        if (!menu.hidden) {
          positionSuggestions();
          requestAnimationFrame(positionSuggestions);
        }
      }

      async function requestSuggestions(query) {
        requestController?.abort();
        requestController = new AbortController();
        const airportOverride = resolveAirportQuery(query);
        const params = new URLSearchParams({
          text: airportOverride || query,
          apiKey: key,
          format: 'json',
          lang: 'en',
          limit: '6',
          filter: 'countrycode:us',
          bias: 'proximity:-80.4012,25.6707'
        });

        try {
          const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
            signal: requestController.signal
          });
          if (!response.ok) throw new Error(`Geoapify request failed (${response.status})`);
          const payload = await response.json();
          renderSuggestions(Array.isArray(payload.results) ? payload.results : [], query);
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Geoapify address autocomplete could not be loaded.', error);
            closeSuggestions();
          }
        }
      }

      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        if (query.length < 3) {
          requestController?.abort();
          closeSuggestions();
          return;
        }

         
         
         
        if (isIPadLikeDevice()) {
          menu.replaceChildren();
          const loading = document.createElement('div');
          loading.className = 'geoapify-suggestion';
          loading.setAttribute('aria-hidden', 'true');
          loading.innerHTML = '<strong>Searching locations…</strong>';
          menu.appendChild(loading);
          menu.hidden = false;
          input.setAttribute('aria-expanded', 'true');
          positionSuggestions();
          requestAnimationFrame(positionSuggestions);
        }

        debounceTimer = setTimeout(() => requestSuggestions(query), 250);
      });

      input.addEventListener('keydown', (event) => {
        if (menu.hidden || !results.length) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActiveSuggestion(activeIndex + 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveSuggestion(activeIndex - 1);
        } else if (event.key === 'Enter' && activeIndex >= 0) {
          event.preventDefault();
          chooseSuggestion(results[activeIndex]);
        } else if (event.key === 'Escape') {
          closeSuggestions();
        }
      });

      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (!selectingSuggestion) closeSuggestions();
        }, 180);
      });
    });
  }

  setupGeoapifyAddressAutocomplete();

  const form = $('#bookingForm');
  const rideTypeInput = $('#rideType');
  const dropoffField = $('#dropoffField');
  const dropoffInput = $('#dropoff');
  const durationField = $('#durationField');
  const durationInput = $('#duration');
  const formMessage = $('#formMessage');
  const dateInput = $('#pickupDate');
  const timeInput = $('#pickupTime');

  function isIPadLandscapeBooking() {
    return window.matchMedia('(min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)').matches;
  }

  function runAfterIPadKeyboardCloses(callback) {
    if (!isIPadLandscapeBooking()) {
      callback();
      return;
    }

    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();

    const viewport = window.visualViewport;
    let finished = false;
    let timer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      if (viewport) viewport.removeEventListener('resize', onViewportResize);
       
       
      requestAnimationFrame(() => requestAnimationFrame(callback));
    };
    const onViewportResize = () => {
      clearTimeout(timer);
      timer = setTimeout(finish, 90);
    };

    if (viewport && viewport.height < window.innerHeight - 100) {
      viewport.addEventListener('resize', onViewportResize);
      timer = setTimeout(finish, 420);
    } else {
      timer = setTimeout(finish, 40);
    }
  }

  function formatIPadDateDisplay(iso) {
    if (!iso) return '';
    const [year, month, day] = String(iso).split('-').map(Number);
    const value = new Date(year, (month || 1) - 1, day || 1);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
  }

  function formatIPadTimeDisplay(value) {
    if (!value) return '';
    const [hourRaw, minuteRaw] = String(value).split(':').map(Number);
    const hour = Number.isFinite(hourRaw) ? hourRaw : 12;
    const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
  }

  function getPickupDateValue() {
    return isIPadLandscapeBooking() ? (dateInput.dataset.isoValue || '') : dateInput.value;
  }
  function setPickupDateValue(value) {
    if (isIPadLandscapeBooking()) {
      dateInput.dataset.isoValue = value;
      dateInput.value = formatIPadDateDisplay(value);
    } else {
      dateInput.value = value;
    }
  }
  function getPickupTimeValue() {
    return isIPadLandscapeBooking() ? (timeInput.dataset.isoValue || '') : timeInput.value;
  }
  function setPickupTimeValue(value) {
    if (isIPadLandscapeBooking()) {
      timeInput.dataset.isoValue = value;
      timeInput.value = formatIPadTimeDisplay(value);
    } else {
      timeInput.value = value;
    }
  }
  function restorePickerFocus(input) {
    if (!isIPadLandscapeBooking()) input.focus();
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function localDateValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function setInitialDateTime() {
    const now = new Date();
    const rounded = new Date(now.getTime() + 60 * 60 * 1000);
    rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);
    dateInput.min = localDateValue(now);
    dateInput.value = localDateValue(rounded);
    timeInput.value = `${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`;
  }
  setInitialDateTime();

  function setupDesktopCalendar() {
    const desktopQuery = window.matchMedia('(min-width:1000px) and (pointer:fine) and (orientation:landscape), (min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)');
    if (!desktopQuery.matches || !dateInput) return;

    const iPadCustomPicker = window.matchMedia('(min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)').matches;
    const dateAnchor = dateInput.closest('.input-wrap');

    document.documentElement.classList.add('desktop-calendar-ready');

     
     
     
     
    if (iPadCustomPicker) {
      const initialISO = dateInput.value;
      dateInput.dataset.isoValue = initialISO;
      dateInput.dataset.minIso = dateInput.min || localDateValue(new Date());
      dateInput.type = 'text';
      dateInput.inputMode = 'none';
      dateInput.autocomplete = 'off';
      dateInput.value = formatIPadDateDisplay(initialISO);
    }
    dateInput.readOnly = true;

     
     
     
     
     
    if (iPadCustomPicker && dateAnchor) {
      dateInput.style.pointerEvents = 'none';
      dateInput.tabIndex = -1;
      dateAnchor.style.cursor = 'pointer';
      dateAnchor.setAttribute('role', 'button');
      dateAnchor.setAttribute('tabindex', '0');
      dateAnchor.setAttribute('aria-label', 'Choose pickup date');
    }

    const calendar = document.createElement('div');
    calendar.className = 'desktop-calendar';
    calendar.hidden = true;
    calendar.setAttribute('role', 'dialog');
    calendar.setAttribute('aria-label', 'Choose pickup date');
    calendar.innerHTML = `
      <div class="desktop-calendar__head">
        <div class="desktop-calendar__title" aria-live="polite"></div>
        <div class="desktop-calendar__nav">
          <button type="button" data-calendar-prev aria-label="Previous month">&#8592;</button>
          <button type="button" data-calendar-next aria-label="Next month">&#8594;</button>
        </div>
      </div>
      <div class="desktop-calendar__week" aria-hidden="true">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="desktop-calendar__days"></div>
      <div class="desktop-calendar__footer">
        <button type="button" data-calendar-close>Cancel</button>
        <button type="button" data-calendar-today>Today</button>
      </div>`;
    document.body.appendChild(calendar);

    const title = $('.desktop-calendar__title', calendar);
    const days = $('.desktop-calendar__days', calendar);
    let visibleMonth = new Date();

    function parseLocalDate(value) {
      const parts = String(value || '').split('-').map(Number);
      return parts.length === 3 && parts.every(Number.isFinite)
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date();
    }

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function renderCalendar() {
      title.textContent = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(visibleMonth);
      days.replaceChildren();

      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      const firstWeekday = new Date(year, month, 1).getDay();
      const dayCount = new Date(year, month + 1, 0).getDate();
      const minimum = startOfDay(parseLocalDate(iPadCustomPicker ? dateInput.dataset.minIso : dateInput.min));
      const selectedValue = getPickupDateValue();
      const selected = selectedValue ? startOfDay(parseLocalDate(selectedValue)) : null;
      const today = startOfDay(new Date());

      for (let blank = 0; blank < firstWeekday; blank += 1) {
        days.appendChild(document.createElement('span'));
      }
      for (let day = 1; day <= dayCount; day += 1) {
        const value = new Date(year, month, day);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'desktop-calendar__day';
        button.textContent = String(day);
        button.disabled = value < minimum;
        button.classList.toggle('is-today', value.getTime() === today.getTime());
        button.classList.toggle('is-selected', Boolean(selected && value.getTime() === selected.getTime()));
        button.setAttribute('aria-label', new Intl.DateTimeFormat('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }).format(value));
        button.addEventListener('click', () => {
          setPickupDateValue(localDateValue(value));
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
          calendar.hidden = true;
          restorePickerFocus(dateInput);
        });
        days.appendChild(button);
      }
    }

    function positionCalendar() {
      const anchor = dateInput.closest('.input-wrap');
      const rect = anchor.getBoundingClientRect();
      const width = calendar.offsetWidth || 320;
      const height = calendar.offsetHeight || 320;
      const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const gap = 8;
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

      let top;
      if (isIPad) {
         
         
         
        const aboveTop = rect.top - height - gap;
        const belowTop = rect.bottom + gap;
        top = aboveTop >= 8 ? aboveTop : Math.min(belowTop, viewportHeight - height - 8);
      } else {
        const above = rect.top - height - 10;
        top = above >= 14 ? above : Math.min(window.innerHeight - height - 14, rect.bottom + 10);
      }

      calendar.style.left = `${left}px`;
      calendar.style.top = `${Math.max(8, top)}px`;
    }

    function openCalendar() {
      const chosen = parseLocalDate(getPickupDateValue());
      visibleMonth = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
      renderCalendar();
      calendar.hidden = false;
      positionCalendar();
    }

    if (iPadCustomPicker && dateAnchor) {
       
       
      dateAnchor.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const active = document.activeElement;
        if (active && active !== document.body && typeof active.blur === 'function') active.blur();
      });
      dateAnchor.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!calendar.hidden) {
          calendar.hidden = true;
          return;
        }
        runAfterIPadKeyboardCloses(openCalendar);
      });
      dateAnchor.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (calendar.hidden) openCalendar();
          else calendar.hidden = true;
        }
        if (event.key === 'Escape') calendar.hidden = true;
      });
    } else {
      dateInput.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (calendar.hidden) openCalendar();
        else calendar.hidden = true;
      });
    }
    dateInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCalendar();
      }
      if (event.key === 'Escape') calendar.hidden = true;
    });
    $('[data-calendar-prev]', calendar).addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    $('[data-calendar-next]', calendar).addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      renderCalendar();
    });
    $('[data-calendar-today]', calendar).addEventListener('click', () => {
      const today = startOfDay(new Date());
      setPickupDateValue(localDateValue(today));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      calendar.hidden = true;
      restorePickerFocus(dateInput);
    });
    $('[data-calendar-close]', calendar).addEventListener('click', () => {
      calendar.hidden = true;
      restorePickerFocus(dateInput);
    });
    document.addEventListener('click', (event) => {
      if (!calendar.hidden && !calendar.contains(event.target) && event.target !== dateInput) {
        calendar.hidden = true;
      }
    });
    window.addEventListener('resize', () => {
      if (!calendar.hidden) positionCalendar();
    });
  }
  setupDesktopCalendar();

  function positionPremiumPicker(picker, anchor, estimatedHeight) {
    const rect = anchor.getBoundingClientRect();
    const width = picker.offsetWidth || 320;
    const height = picker.offsetHeight || estimatedHeight;
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const gap = 8;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    let top;
    if (isIPad) {
      const aboveTop = rect.top - height - gap;
      const belowTop = rect.bottom + gap;
      top = aboveTop >= 8 ? aboveTop : Math.min(belowTop, viewportHeight - height - 8);
    } else {
      const above = rect.top - height - 10;
      top = above >= 14 ? above : Math.min(window.innerHeight - height - 14, rect.bottom + 10);
    }

    picker.style.left = `${left}px`;
    picker.style.top = `${Math.max(8, top)}px`;
  }

  function setupDesktopTimePicker() {
    const desktopQuery = window.matchMedia('(min-width:1000px) and (pointer:fine) and (orientation:landscape), (min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)');
    if (!desktopQuery.matches || !timeInput) return;
    const iPadCustomPicker = window.matchMedia('(min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)').matches;
    const timeAnchor = timeInput.closest('.input-wrap');
    document.documentElement.classList.add('premium-time-ready');

     
     
    if (iPadCustomPicker) {
      const initialTime = timeInput.value;
      timeInput.dataset.isoValue = initialTime;
      timeInput.type = 'text';
      timeInput.inputMode = 'none';
      timeInput.autocomplete = 'off';
      timeInput.value = formatIPadTimeDisplay(initialTime);
    }
    timeInput.readOnly = true;

     
     
    if (iPadCustomPicker && timeAnchor) {
      timeInput.style.pointerEvents = 'none';
      timeInput.tabIndex = -1;
      timeAnchor.style.cursor = 'pointer';
      timeAnchor.setAttribute('role', 'button');
      timeAnchor.setAttribute('tabindex', '0');
      timeAnchor.setAttribute('aria-label', 'Choose pickup time');
    }

    const picker = document.createElement('div');
    picker.className = 'premium-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', 'Choose pickup time');
    const hourOptions = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');
    const minuteOptions = Array.from({ length: 12 }, (_, index) => {
      const minute = String(index * 5).padStart(2, '0');
      return `<option value="${minute}">${minute}</option>`;
    }).join('');
    picker.innerHTML = `
      <div class="premium-picker__head">
        <div class="premium-picker__title">Pickup time</div>
        <button type="button" class="premium-picker__close" aria-label="Close time picker">&#10005;</button>
      </div>
      <div class="premium-time-grid">
        <label class="premium-time-column"><span>Hour</span><select data-time-hour>${hourOptions}</select></label>
        <label class="premium-time-column"><span>Minute</span><select data-time-minute>${minuteOptions}</select></label>
        <label class="premium-time-column"><span>Period</span><select data-time-period><option>AM</option><option>PM</option></select></label>
      </div>
      <button type="button" class="premium-picker__confirm">Set pickup time</button>`;
    document.body.appendChild(picker);

    const hourSelect = $('[data-time-hour]', picker);
    const minuteSelect = $('[data-time-minute]', picker);
    const periodSelect = $('[data-time-period]', picker);

    function syncTimeControls() {
      const [rawHour, rawMinute] = String(getPickupTimeValue() || '12:00').split(':').map(Number);
      const hour24 = Number.isFinite(rawHour) ? rawHour : 12;
      const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
      hourSelect.value = String(hour24 % 12 || 12);
      minuteSelect.value = String(Math.round(minute / 5) * 5 % 60).padStart(2, '0');
      periodSelect.value = hour24 >= 12 ? 'PM' : 'AM';
    }
    function openTimePicker() {
      syncTimeControls();
      picker.hidden = false;
      positionPremiumPicker(picker, timeInput.closest('.input-wrap'), 190);
    }
    function closeTimePicker() {
      picker.hidden = true;
      restorePickerFocus(timeInput);
    }
    if (iPadCustomPicker && timeAnchor) {
      timeAnchor.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const active = document.activeElement;
        if (active && active !== document.body && typeof active.blur === 'function') active.blur();
      });
      timeAnchor.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!picker.hidden) {
          picker.hidden = true;
          return;
        }
        runAfterIPadKeyboardCloses(openTimePicker);
      });
      timeAnchor.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (picker.hidden) openTimePicker();
          else picker.hidden = true;
        }
        if (event.key === 'Escape') picker.hidden = true;
      });
    } else {
      timeInput.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (picker.hidden) openTimePicker();
        else picker.hidden = true;
      });
    }
    timeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTimePicker();
      }
      if (event.key === 'Escape') picker.hidden = true;
    });
    $('.premium-picker__close', picker).addEventListener('click', closeTimePicker);
    $('.premium-picker__confirm', picker).addEventListener('click', () => {
      let hour = Number(hourSelect.value) % 12;
      if (periodSelect.value === 'PM') hour += 12;
      setPickupTimeValue(`${pad(hour)}:${minuteSelect.value}`);
      timeInput.dispatchEvent(new Event('change', { bubbles: true }));
      closeTimePicker();
    });
    document.addEventListener('click', (event) => {
      if (!picker.hidden && !picker.contains(event.target) && event.target !== timeInput) picker.hidden = true;
    });
  }
  setupDesktopTimePicker();

  function setupDesktopPassengerPicker() {
    const desktopQuery = window.matchMedia('(min-width:1000px) and (pointer:fine) and (orientation:landscape), (min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)');
    const passengerInput = $('#passengers');
    if (!desktopQuery.matches || !passengerInput) return;
    document.documentElement.classList.add('premium-passengers-ready');

    const picker = document.createElement('div');
    picker.className = 'premium-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', 'Choose number of passengers');
    picker.innerHTML = `
      <div class="premium-picker__head">
        <div class="premium-picker__title">Number of passengers</div>
        <button type="button" class="premium-picker__close" aria-label="Close passenger picker">&#10005;</button>
      </div>
      <div class="premium-passenger-grid">
        ${[1,2,3,4,5,6].map((count) => `<button type="button" class="premium-passenger-option" data-passenger-count="${count}">${count}</button>`).join('')}
      </div>`;
    document.body.appendChild(picker);

    function renderPassengerSelection() {
      $$('.premium-passenger-option', picker).forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.passengerCount === passengerInput.value);
      });
    }
    function openPassengerPicker() {
      renderPassengerSelection();
      picker.hidden = false;
      positionPremiumPicker(picker, passengerInput, 180);
    }
    passengerInput.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (isIPadLandscapeBooking()) {
        const active = document.activeElement;
        if (active && active !== document.body && typeof active.blur === 'function') active.blur();
      }
    });
    passengerInput.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!picker.hidden) { picker.hidden = true; return; }
      if (isIPadLandscapeBooking()) runAfterIPadKeyboardCloses(openPassengerPicker);
      else openPassengerPicker();
    });
    passengerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPassengerPicker();
      }
      if (event.key === 'Escape') picker.hidden = true;
    });
    $$('.premium-passenger-option', picker).forEach((button) => {
      button.addEventListener('click', () => {
        passengerInput.value = button.dataset.passengerCount;
        passengerInput.dispatchEvent(new Event('change', { bubbles: true }));
        picker.hidden = true;
        restorePickerFocus(passengerInput);
      });
    });
    $('.premium-picker__close', picker).addEventListener('click', () => {
      picker.hidden = true;
      restorePickerFocus(passengerInput);
    });
    document.addEventListener('click', (event) => {
      if (!picker.hidden && !picker.contains(event.target) && event.target !== passengerInput) picker.hidden = true;
    });
  }
  setupDesktopPassengerPicker();

  function setupDesktopDurationPicker() {
    const desktopQuery = window.matchMedia('(min-width:1000px) and (pointer:fine) and (orientation:landscape), (min-width:768px) and (max-width:1366px) and (orientation:landscape) and (pointer:coarse)');
    if (!desktopQuery.matches || !durationInput) return;
    document.documentElement.classList.add('premium-duration-ready');

    const picker = document.createElement('div');
    picker.className = 'premium-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', 'Choose hourly ride duration');
    const durationOptions = [...durationInput.options].map((option) => ({
      value: option.value,
      label: option.textContent
    }));
    picker.innerHTML = `
      <div class="premium-picker__head">
        <div class="premium-picker__title">How many hours?</div>
        <button type="button" class="premium-picker__close" aria-label="Close duration picker">&#10005;</button>
      </div>
      <div class="premium-duration-grid">
        ${durationOptions.map((option) => `<button type="button" class="premium-duration-option" data-duration-value="${option.value}">${option.label}</button>`).join('')}
      </div>`;
    document.body.appendChild(picker);

    function renderDurationSelection() {
      $$('.premium-duration-option', picker).forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.durationValue === durationInput.value);
      });
    }
    function openDurationPicker() {
      renderDurationSelection();
      picker.hidden = false;
      positionPremiumPicker(picker, durationInput.closest('.input-wrap'), 260);
    }
    durationInput.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (isIPadLandscapeBooking()) {
        const active = document.activeElement;
        if (active && active !== document.body && typeof active.blur === 'function') active.blur();
      }
    });
    durationInput.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!picker.hidden) { picker.hidden = true; return; }
      if (isIPadLandscapeBooking()) runAfterIPadKeyboardCloses(openDurationPicker);
      else openDurationPicker();
    });
    durationInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDurationPicker();
      }
      if (event.key === 'Escape') picker.hidden = true;
    });
    $$('.premium-duration-option', picker).forEach((button) => {
      button.addEventListener('click', () => {
        durationInput.value = button.dataset.durationValue;
        durationInput.dispatchEvent(new Event('change', { bubbles: true }));
        picker.hidden = true;
        restorePickerFocus(durationInput);
      });
    });
    $('.premium-picker__close', picker).addEventListener('click', () => {
      picker.hidden = true;
      restorePickerFocus(durationInput);
    });
    document.addEventListener('click', (event) => {
      if (!picker.hidden && !picker.contains(event.target) && event.target !== durationInput) picker.hidden = true;
    });
  }
  setupDesktopDurationPicker();

  [dateInput, timeInput].forEach((input) => {
    input?.addEventListener('click', () => {
       
       
      if (isIPadLandscapeBooking()) return;
      if (input === dateInput && document.documentElement.classList.contains('desktop-calendar-ready')) return;
      if (input === timeInput && document.documentElement.classList.contains('premium-time-ready')) return;
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); } catch (_) {}
      }
    });
  });

  $$('.ride-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const type = tab.dataset.rideType;
      rideTypeInput.value = type;
      $$('.ride-tab').forEach((button) => {
        const selected = button === tab;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      const isHourly = type === 'hourly';
      dropoffField.classList.toggle('is-hidden', isHourly);
      durationField.classList.toggle('is-hidden', !isHourly);
      dropoffInput.required = !isHourly;
      durationInput.required = isHourly;
      formMessage.textContent = '';
    });
  });

  function buildBookingId() {
    const date = new Date();
    const datePart = `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(-5).toUpperCase().padStart(5, '0');
    return `DRV-${datePart}-${randomPart}`;
  }

  function formatRideDate(dateValue, timeValue) {
    const date = new Date(`${dateValue}T${timeValue}:00`);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function validateReservation(data) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return 'Please complete every required field.';
    }
    const pickupDateTime = new Date(`${data.pickupDate}T${data.pickupTime}:00`);
    if (Number.isNaN(pickupDateTime.getTime()) || pickupDateTime <= new Date()) {
      return 'Please choose a pickup time in the future.';
    }
    return '';
  }

  function saveLocal(record) {
    try {
      const existing = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      existing.unshift(record);
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(existing.slice(0, 250)));
      return true;
    } catch (error) {
      console.warn('Local reservation storage is unavailable.', error);
      return false;
    }
  }

  async function sendToEndpoint(record) {
    if (!CONFIG.bookingEndpoint) return { stored: 'local' };

    const payload = {
      _subject: `DRIVISTA test reservation — ${record.bookingId}`,
      _template: 'table',
      ...record
    };

    const response = await fetch(CONFIG.bookingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Booking service returned ${response.status}`);
    return { stored: 'central' };
  }

  const dialog = $('#confirmationDialog');
  const details = $('#confirmationDetails');
  const confirmationId = $('#confirmationId');
  const recordStatus = $('#recordStatus');
  let currentRecord = null;

  function detail(label, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-row';
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }

  function displayConfirmation(record, storageMode) {
    currentRecord = record;
    confirmationId.textContent = record.bookingId;
    details.replaceChildren(
      detail('Passenger', record.passengerName),
      detail('Ride type', record.rideType === 'hourly' ? `By the hour · ${record.duration}` : 'One way'),
      detail('Pickup', record.pickup),
      detail(record.rideType === 'hourly' ? 'Duration' : 'Drop-off', record.rideType === 'hourly' ? record.duration : record.dropoff),
      detail('Pickup date & time', record.formattedPickup),
      detail('Passengers', record.passengers),
      detail('Email', record.email),
      detail('Mobile', record.phone)
    );
    recordStatus.textContent = storageMode === 'central'
      ? 'Test reservation emailed successfully and saved on this iPad.'
      : storageMode === 'local'
        ? 'Saved on this iPad. Connect the production booking endpoint for centralized records.'
        : 'Confirmation created. Download or print it now; local storage is unavailable on this device.';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries());
    if (isIPadLandscapeBooking()) {
      data.pickupDate = getPickupDateValue();
      data.pickupTime = getPickupTimeValue();
    }
    const validationError = validateReservation(data);
    if (validationError) {
      formMessage.textContent = validationError;
      return;
    }

    const record = {
      bookingId: buildBookingId(),
      createdAt: new Date().toISOString(),
      createdAtLocal: new Date().toString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      rideType: data.rideType,
      pickup: data.pickup.trim(),
      dropoff: data.rideType === 'hourly' ? '' : data.dropoff.trim(),
      duration: data.rideType === 'hourly' ? data.duration : '',
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      formattedPickup: formatRideDate(data.pickupDate, data.pickupTime),
      passengerName: data.passengerName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      passengers: data.passengers,
      source: 'DRIVISTA in-car iPad landing page'
    };

    const savedLocally = saveLocal(record);
    let storageMode = savedLocally ? 'local' : 'memory';
    try {
      const result = await sendToEndpoint(record);
      if (result.stored === 'central') storageMode = 'central';
    } catch (error) {
      console.error(error);
      formMessage.textContent = 'The central system could not be reached. Your reservation was preserved on this iPad.';
    }
    displayConfirmation(record, storageMode);
  });

  $('#closeConfirmation').addEventListener('click', () => {
    dialog.close();
    form.reset();
    rideTypeInput.value = 'one-way';
    $$('.ride-tab').forEach((tab, i) => {
      tab.classList.toggle('is-selected', i === 0);
      tab.setAttribute('aria-selected', String(i === 0));
    });
    dropoffField.classList.remove('is-hidden');
    durationField.classList.add('is-hidden');
    dropoffInput.required = true;
    setInitialDateTime();
  });

  $('#copyBookingId').addEventListener('click', async () => {
    if (!currentRecord) return;
    try {
      await navigator.clipboard.writeText(currentRecord.bookingId);
      recordStatus.textContent = 'Confirmation number copied.';
    } catch {
      recordStatus.textContent = `Confirmation: ${currentRecord.bookingId}`;
    }
  });

  $('#downloadConfirmation').addEventListener('click', () => {
    if (!currentRecord) return;
    const record = currentRecord;
    const content = [
      'DRIVISTA — RIDE RESERVATION CONFIRMATION',
      '=========================================',
      `Confirmation: ${record.bookingId}`,
      `Recorded: ${record.createdAtLocal}`,
      '',
      `Passenger: ${record.passengerName}`,
      `Ride type: ${record.rideType === 'hourly' ? `By the hour (${record.duration})` : 'One way'}`,
      `Pickup: ${record.pickup}`,
      record.rideType === 'hourly' ? `Duration: ${record.duration}` : `Drop-off: ${record.dropoff}`,
      `Pickup date & time: ${record.formattedPickup}`,
      `Passengers: ${record.passengers}`,
      `Email: ${record.email}`,
      `Mobile: ${record.phone}`,
      '',
      'This file records the reservation details as originally submitted.'
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${record.bookingId}-confirmation.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  $('#printConfirmation').addEventListener('click', () => window.print());

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    $('#closeConfirmation').click();
  });
})();
