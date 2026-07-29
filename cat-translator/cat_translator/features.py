import numpy as np
import scipy.fftpack
import scipy.signal
import soundfile as sf

TARGET_SR = 22050
FRAME_MS = 25
HOP_MS = 10
N_MFCC = 20
N_MELS = 40
N_FFT = 512
FMIN = 0
FMAX = None
DELTA_N = 2


def pre_emphasis(signal: np.ndarray, alpha: float = 0.97) -> np.ndarray:
    return np.append(signal[0], signal[1:] - alpha * signal[:-1])


def framing(signal: np.ndarray, sr: int) -> np.ndarray:
    frame_len = int(sr * FRAME_MS / 1000)
    hop_len = int(sr * HOP_MS / 1000)
    n_frames = 1 + (len(signal) - frame_len) // hop_len
    if n_frames <= 0:
        return np.zeros((0, frame_len))
    frames = np.empty((n_frames, frame_len))
    for i in range(n_frames):
        start = i * hop_len
        end = start + frame_len
        frames[i] = signal[start:end]
    return frames


def hamming_window(frame_len: int) -> np.ndarray:
    return 0.54 - 0.46 * np.cos(
        2 * np.pi * np.arange(frame_len) / (frame_len - 1)
    )


def mel_filterbank(
    n_mels: int, n_fft: int, sr: int, fmin: int = 0, fmax: int | None = None
) -> np.ndarray:
    if fmax is None:
        fmax = sr // 2
    mel_min = 2595 * np.log10(1 + fmin / 700)
    mel_max = 2595 * np.log10(1 + fmax / 700)
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = 700 * (10 ** (mel_points / 2595) - 1)
    bins = np.floor((n_fft + 1) * hz_points / sr).astype(int)
    bins = np.clip(bins, 0, n_fft // 2)

    fb = np.zeros((n_mels, n_fft // 2 + 1))
    for m in range(1, n_mels + 1):
        f_m_minus = bins[m - 1]
        f_m = bins[m]
        f_m_plus = bins[m + 1]
        for k in range(f_m_minus, f_m):
            fb[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
        for k in range(f_m, f_m_plus):
            fb[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)
    return fb


def compute_delta(feats: np.ndarray, N: int = 2) -> np.ndarray:
    padded = np.pad(feats, ((N, N), (0, 0)), mode="edge")
    delta = np.zeros_like(feats)
    denom = 2 * sum(i**2 for i in range(1, N + 1))
    for t in range(len(feats)):
        delta[t] = (
            sum(
                i * (padded[t + i + N] - padded[t - i + N])
                for i in range(1, N + 1)
            )
            / denom
        )
    return delta


def spectral_features(
    signal: np.ndarray, sr: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    frames = framing(signal, sr)
    if len(frames) == 0:
        return np.array([0.0]), np.array([0.0]), np.array([0.0])

    frame_len = frames.shape[1]
    n_fft = max(N_FFT, frame_len)
    mag = np.abs(np.fft.rfft(frames, n=n_fft))
    freqs = np.linspace(0, sr // 2, mag.shape[1])

    total_mag = mag.sum(axis=1)
    total_mag = np.maximum(total_mag, 1e-10)
    centroid = (mag * freqs).sum(axis=1) / total_mag

    spread = np.sqrt(
        (mag * (freqs - centroid[:, np.newaxis]) ** 2).sum(axis=1) / total_mag
    )

    rms = np.sqrt((signal**2).sum() / len(signal))
    zcr = ((signal[:-1] * signal[1:]) < 0).sum() / len(signal)

    rs = np.full(len(frames), rms)
    zs = np.full(len(frames), zcr)

    return centroid, spread, rs


def mfcc_per_frame(signal: np.ndarray, sr: int) -> np.ndarray:
    signal = pre_emphasis(signal)
    frames = framing(signal, sr)
    if len(frames) == 0:
        return np.zeros((0, N_MFCC))
    frame_len = frames.shape[1]
    window = hamming_window(frame_len)
    frames = frames * window

    n_fft = max(N_FFT, frame_len)
    mag_spec = np.abs(np.fft.rfft(frames, n=n_fft))
    power_spec = (1.0 / n_fft) * (mag_spec**2)

    fb = mel_filterbank(N_MELS, n_fft, sr, fmin=FMIN, fmax=FMAX)
    mel_energy = np.dot(power_spec, fb.T)
    mel_energy = np.maximum(mel_energy, np.finfo(float).eps)
    log_mel = np.log(mel_energy)

    mfcc_coeffs = scipy.fftpack.dct(
        log_mel, type=2, axis=1, norm="ortho"
    )[:, :N_MFCC]
    return mfcc_coeffs


def extract_aggregated(filepath: str) -> np.ndarray:
    signal, sr = sf.read(filepath)
    if sr != TARGET_SR:
        num_samples = int(round(len(signal) * TARGET_SR / sr))
        signal = scipy.signal.resample(signal, num_samples)
        sr = TARGET_SR

    m = mfcc_per_frame(signal, sr)
    if len(m) == 0:
        n_mfcc_feats = 2 * N_MFCC * 3
        n_spec = 6
        return np.zeros(n_mfcc_feats + n_spec)

    d = compute_delta(m, N=DELTA_N)
    d2 = compute_delta(d, N=DELTA_N)

    feats = []
    for arr in (m, d, d2):
        feats.append(arr.mean(axis=0))
        feats.append(arr.std(axis=0))

    centroid, spread, rms = spectral_features(signal, sr)
    feats.append(np.array([centroid.mean(), centroid.std()]))
    feats.append(np.array([spread.mean(), spread.std()]))
    feats.append(np.array([rms.mean(), rms.std()]))

    return np.concatenate(feats)
