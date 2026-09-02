# Filter design

EKF-style predict/update with accel-as-input: F with dt coupling altitude-velocity-bias; Q=
diag(0.05,0.02,1e-4); altimeter H=[1 0 0], R=sigma^2; innovation & covariance computed per update.
Reference estimate only; the safety cage never trusts ML confidence alone. Covariance growth and
filter divergence are monitored by the cage.
