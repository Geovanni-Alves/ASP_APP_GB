/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps } from "@aws-amplify/ui-react";
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
export declare type KidsScheduleUpdateFormInputValues = {
    Monday?: boolean;
    Tuesday?: boolean;
    Wednesday?: boolean;
    Thursday?: boolean;
    Friday?: boolean;
};
export declare type KidsScheduleUpdateFormValidationValues = {
    Monday?: ValidationFunction<boolean>;
    Tuesday?: ValidationFunction<boolean>;
    Wednesday?: ValidationFunction<boolean>;
    Thursday?: ValidationFunction<boolean>;
    Friday?: ValidationFunction<boolean>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type KidsScheduleUpdateFormOverridesProps = {
    KidsScheduleUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Monday?: PrimitiveOverrideProps<SwitchFieldProps>;
    Tuesday?: PrimitiveOverrideProps<SwitchFieldProps>;
    Wednesday?: PrimitiveOverrideProps<SwitchFieldProps>;
    Thursday?: PrimitiveOverrideProps<SwitchFieldProps>;
    Friday?: PrimitiveOverrideProps<SwitchFieldProps>;
} & EscapeHatchProps;
export declare type KidsScheduleUpdateFormProps = React.PropsWithChildren<{
    overrides?: KidsScheduleUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    kidsSchedule?: any;
    onSubmit?: (fields: KidsScheduleUpdateFormInputValues) => KidsScheduleUpdateFormInputValues;
    onSuccess?: (fields: KidsScheduleUpdateFormInputValues) => void;
    onError?: (fields: KidsScheduleUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: KidsScheduleUpdateFormInputValues) => KidsScheduleUpdateFormInputValues;
    onValidate?: KidsScheduleUpdateFormValidationValues;
} & React.CSSProperties>;
export default function KidsScheduleUpdateForm(props: KidsScheduleUpdateFormProps): React.ReactElement;
