/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ConfigsUpdateFormInputValues = {
    defaultVanPhoto?: string;
    defaultUserPhoto?: string;
    phoneNumberManager?: string;
};
export declare type ConfigsUpdateFormValidationValues = {
    defaultVanPhoto?: ValidationFunction<string>;
    defaultUserPhoto?: ValidationFunction<string>;
    phoneNumberManager?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ConfigsUpdateFormOverridesProps = {
    ConfigsUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    defaultVanPhoto?: PrimitiveOverrideProps<TextFieldProps>;
    defaultUserPhoto?: PrimitiveOverrideProps<TextFieldProps>;
    phoneNumberManager?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ConfigsUpdateFormProps = React.PropsWithChildren<{
    overrides?: ConfigsUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    configs?: any;
    onSubmit?: (fields: ConfigsUpdateFormInputValues) => ConfigsUpdateFormInputValues;
    onSuccess?: (fields: ConfigsUpdateFormInputValues) => void;
    onError?: (fields: ConfigsUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ConfigsUpdateFormInputValues) => ConfigsUpdateFormInputValues;
    onValidate?: ConfigsUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ConfigsUpdateForm(props: ConfigsUpdateFormProps): React.ReactElement;
