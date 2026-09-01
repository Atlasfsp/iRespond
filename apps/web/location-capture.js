(function locationCapture() {
  const enhancedAttribute = 'data-location-capture-enhanced';

  function parseCoordinate(value, minimum, maximum, label) {
    const text = String(value ?? '').trim();
    if (!text) throw new Error(`${label} is required.`);
    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
      throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
    }
    return parsed;
  }

  function validateInterventionCoordinates(latitude, longitude) {
    return {
      latitude: parseCoordinate(latitude, -90, 90, 'Latitude'),
      longitude: parseCoordinate(longitude, -180, 180, 'Longitude'),
    };
  }

  function displayCoordinate(value) {
    return Number(value).toFixed(6);
  }

  function setStatus(status, message, state = 'pending') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function geolocationMessage(error) {
    if (error?.code === 1) return 'Location permission was not granted. Enter the intervention coordinates manually.';
    if (error?.code === 2) return 'Your device could not determine its location. Check location services or enter coordinates manually.';
    if (error?.code === 3) return 'Location capture timed out. Try again outdoors or enter coordinates manually.';
    return 'Current coordinates could not be captured. Enter them manually and confirm before submitting.';
  }

  function enhanceReportForm(form) {
    if (form.hasAttribute(enhancedAttribute)) return;
    const latitude = form.elements.namedItem('latitude');
    const longitude = form.elements.namedItem('longitude');
    const submitField = form.querySelector('button[type="submit"]')?.closest('.field');
    if (!(latitude instanceof HTMLInputElement) || !(longitude instanceof HTMLInputElement) || !submitField) return;

    form.setAttribute(enhancedAttribute, 'true');
    latitude.type = 'number';
    latitude.min = '-90';
    latitude.max = '90';
    latitude.step = 'any';
    longitude.type = 'number';
    longitude.min = '-180';
    longitude.max = '180';
    longitude.step = 'any';

    const capture = document.createElement('div');
    capture.className = 'field full coordinate-capture';
    capture.innerHTML = '<button class="button secondary" id="report-use-location" type="button">Use my current coordinates</button><p class="location-status" id="report-location-status" data-state="pending" role="status" aria-live="polite">Use high-accuracy device location or enter both coordinates manually.</p>';
    latitude.closest('.field')?.before(capture);

    const confirmation = document.createElement('label');
    confirmation.className = 'field full coordinate-confirmation';
    confirmation.innerHTML = '<input name="locationConfirmed" type="checkbox" required><span>I confirm these coordinates point to the intervention location.</span>';
    submitField.before(confirmation);

    const button = capture.querySelector('#report-use-location');
    const status = capture.querySelector('#report-location-status');
    const checkbox = confirmation.querySelector('input');
    if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement) || !(checkbox instanceof HTMLInputElement)) return;

    function markManualEntry() {
      form.dataset.locationSource = 'manual';
      checkbox.checked = false;
      try {
        const coordinates = validateInterventionCoordinates(latitude.value, longitude.value);
        setStatus(status, `Manual coordinates ready: ${displayCoordinate(coordinates.latitude)}, ${displayCoordinate(coordinates.longitude)}. Check the location, then confirm it.`, 'ready');
      } catch {
        setStatus(status, 'Manual entry selected. Enter latitude from -90 to 90 and longitude from -180 to 180.', 'pending');
      }
    }

    latitude.addEventListener('input', markManualEntry);
    longitude.addEventListener('input', markManualEntry);
    button.addEventListener('click', () => {
      if (!navigator.geolocation) {
        setStatus(status, 'This browser does not provide device location. Enter both coordinates manually.', 'error');
        return;
      }
      button.disabled = true;
      button.textContent = 'Capturing precise coordinates…';
      checkbox.checked = false;
      setStatus(status, 'Waiting for a fresh high-accuracy device location…');
      navigator.geolocation.getCurrentPosition(position => {
        try {
          const coordinates = validateInterventionCoordinates(position.coords.latitude, position.coords.longitude);
          latitude.value = displayCoordinate(coordinates.latitude);
          longitude.value = displayCoordinate(coordinates.longitude);
          form.dataset.locationSource = 'device';
          const accuracy = Number.isFinite(position.coords.accuracy) ? ` · accuracy ±${Math.round(position.coords.accuracy)} m` : '';
          const capturedAt = new Date(position.timestamp || Date.now()).toLocaleString();
          setStatus(status, `Device captured ${latitude.value}, ${longitude.value}${accuracy} · ${capturedAt}. Check the location, then confirm it.`, 'ready');
        } catch (error) {
          setStatus(status, error instanceof Error ? error.message : 'The device returned invalid coordinates.', 'error');
        } finally {
          button.disabled = false;
          button.textContent = 'Capture current coordinates again';
        }
      }, error => {
        setStatus(status, geolocationMessage(error), 'error');
        button.disabled = false;
        button.textContent = 'Try current coordinates again';
      }, { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
    });

    form.addEventListener('submit', event => {
      try {
        const coordinates = validateInterventionCoordinates(latitude.value, longitude.value);
        if (!checkbox.checked) throw new Error('Confirm that these coordinates identify the intervention location before submitting.');
        latitude.value = String(coordinates.latitude);
        longitude.value = String(coordinates.longitude);
      } catch (error) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setStatus(status, error instanceof Error ? error.message : 'Valid confirmed coordinates are required.', 'error');
        if (!latitude.value) latitude.focus();
        else if (!longitude.value) longitude.focus();
        else checkbox.focus();
      }
    }, true);
  }

  function enhanceCurrentScreen() {
    const form = document.querySelector('#report-form');
    if (form instanceof HTMLFormElement) enhanceReportForm(form);
  }

  new MutationObserver(enhanceCurrentScreen).observe(document.body, { childList: true, subtree: true });
  enhanceCurrentScreen();
  window.IRespondLocationCapture = Object.freeze({ validateInterventionCoordinates, enhanceReportForm });
})();
