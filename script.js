window.onload = () => {
  const warningEl = document.getElementById('warning');
  const captureBtn = document.getElementById('captureBtn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');

  if ('getDisplayMedia' in navigator.mediaDevices)
    warningEl.style.display = 'none';

  let blobs;
  let blob;
  let rec;
  let stream;
  let voiceStream;
  let desktopStream;
  let blobFile;

  const mergeAudioStreams = (desktopStream, voiceStream) => {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    let hasDesktop = false;
    let hasVoice = false;
    if (desktopStream && desktopStream.getAudioTracks().length > 0) {
      // If you don't want to share Audio from the desktop it should still work with just the voice.
      const source1 = context.createMediaStreamSource(desktopStream);
      const desktopGain = context.createGain();
      desktopGain.gain.value = 0.7;
      source1.connect(desktopGain).connect(destination);
      hasDesktop = true;
    }

    if (voiceStream && voiceStream.getAudioTracks().length > 0) {
      const source2 = context.createMediaStreamSource(voiceStream);
      const voiceGain = context.createGain();
      voiceGain.gain.value = 0.7;
      source2.connect(voiceGain).connect(destination);
      hasVoice = true;
    }

    return hasDesktop || hasVoice ? destination.stream.getAudioTracks() : [];
  };

  captureBtn.onclick = async () => {
    desktopStream = await navigator.mediaDevices.getDisplayMedia({
      preferCurrentTab: true,
      video: true,
      audio: true,
    });

    voiceStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });

    const tracks = [
      ...desktopStream.getVideoTracks(),
      ...mergeAudioStreams(desktopStream, voiceStream),
    ];

    console.log('Tracks to add to stream', tracks);
    stream = new MediaStream(tracks);
    console.log('Stream', stream);

    blobs = [];

    rec = new MediaRecorder(stream, {
      mimeType: 'audio/webm; codecs=opus',
    });
    rec.ondataavailable = (e) => blobs.push(e.data);
    rec.onstop = async () => {
      blob = new Blob(blobs, { type: 'audio/mpeg ; codecs=opus' });
      let url = window.URL.createObjectURL(blob);

      const fileName = url.split('/').slice(-1)[0] + '.mp3';

      blobFile = new File([blob], fileName);

      url = window.URL.createObjectURL(blobFile);

      addAudio(url);

      document.querySelector('audio').src = url;

      console.log(url);

      let container = new DataTransfer();
      container.items.add(blobFile);
      //console.log(container.files[0]);

      const inputFile = document.querySelector('input[type="file"]');
      inputFile.files = container.files;

      console.log(blobFile.size);
    };
    startBtn.disabled = false;
    captureBtn.disabled = true;
  };

  startBtn.onclick = () => {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    rec.start();
  };

  stopBtn.onclick = () => {
    captureBtn.disabled = false;
    startBtn.disabled = true;
    stopBtn.disabled = true;

    rec.stop();

    stream.getTracks().forEach((s) => s.stop());
    stream = null;
  };

  const addAudio = (url) => {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    const audios = document.getElementById('audios');
    audios.innerHTML = '';
    audios.append(audio);
  };

  const showVideo = (link) => {
    const video = `
        <video width='640' height='360' controls>
          <source src="${link}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    const root = document.getElementById('links');
    root.innerHTML = video;
  };

  const getFromJSON = async () => {
    const res = await fetch('data.json');
    const data = await res.json();

    const videos = data.videos;

    let btn = ``;
    for (let d of videos) {
      // console.log(`${d.title.stringValue} ${d.videoLink.stringValue}`);
      btn += `<a href='' onclick='showVideo("${d.videoLink.stringValue}")'>${d.title.stringValue}</a><br/>`;
    }
    const links = document.getElementById('links');
    links.innerHTML = btn;
  };
};
