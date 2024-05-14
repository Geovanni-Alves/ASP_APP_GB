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
export declare type PicturesUpdateFormInputValues = {
    picture?: string;
    kidID?: string;
};
export declare type PicturesUpdateFormValidationValues = {
    picture?: ValidationFunction<string>;
    kidID?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type PicturesUpdateFormOverridesProps = {
    PicturesUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    picture?: PrimitiveOverrideProps<TextFieldProps>;
    kidID?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type PicturesUpdateFormProps = React.PropsWithChildren<{
    overrides?: PicturesUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    pictures?: any;
    onSubmit?: (fields: PicturesUpdateFormInputValues) => PicturesUpdateFormInputValues;
    onSuccess?: (fields: PicturesUpdateFormInputValues) => void;
    onError?: (fields: PicturesUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: PicturesUpdateFormInputValues) => PicturesUpdateFormInputValues;
    onValidate?: PicturesUpdateFormValidationValues;
} & React.CSSProperties>;
export default function PicturesUpdateForm(props: PicturesUpdateFormProps): React.ReactElement;
