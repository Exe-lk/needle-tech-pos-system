import SwalCore from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// Main SweetAlert2 instance wrapped for React usage.
export const Swal = withReactContent(SwalCore);

// Reusable toast instance for non-blocking notifications.
export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  timer: 3000,
  showConfirmButton: false,
  timerProgressBar: true,
});

export default Swal;
