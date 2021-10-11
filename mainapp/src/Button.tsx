import { styled } from "@material-ui/core/styles";
import { spacing } from "@material-ui/system";
import MuiButton from "@material-ui/core/Button";

/**
 * Applies the spacing system to the material UI Button
 */
const Button = styled(MuiButton)(spacing);

export default Button;