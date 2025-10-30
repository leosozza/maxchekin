# Testing Bitrix Lead Creation

This document describes how to test the Bitrix lead creation functionality after the field code updates.

## What Changed

The following field codes were updated in the lead creation process:

1. **UF_CRM_MODEL_NAME** → **UF_CRM_1739563541** (Model name field)
2. **UF_CRM_AGE** → **UF_CRM_1740000000** (Age field)

Default values were set for:
- **SOURCE_ID**: 'CALL'
- **PARENT_ID_1120**: 4
- **UF_CRM_1741215746**: 4

Fields that are always populated:
- **UF_CRM_1744900570916**: Populated with the lead's name from the form
- **UF_CRM_LEAD_1732627097745**: Populated with the model name from the form
- **UF_CRM_1739563541**: Populated with the model name from the form

## How to Test

### 1. Test via Check-In Form

1. Navigate to the check-in page (`/checkin` or `/checkin-new`)
2. Fill in the form with test data:
   - **Nome**: Test Lead Name
   - **Nome do Modelo**: Test Model Name
   - **Idade**: 25
   - **Telefone**: (11) 99999-9999

3. Submit the form and verify that a lead is created in Bitrix24

### 2. Verify in Bitrix24

After creating a lead, log into your Bitrix24 account and verify the following fields:

1. **Lead Title**: Should be "Novo Lead Recepção - Test Lead Name"
2. **NAME**: Should be "Test Lead Name"
3. **UF_CRM_1739563541**: Should be "Test Model Name"
4. **UF_CRM_1740000000**: Should be "25"
5. **SOURCE_ID**: Should be "CALL" (or configured value)
6. **PARENT_ID_1120**: Should be "4" (or configured value)
7. **UF_CRM_1741215746**: Should be "4" (or configured value)
8. **UF_CRM_1744900570916**: Should be "Test Lead Name"
9. **UF_CRM_LEAD_1732627097745**: Should be "Test Model Name"
10. **PHONE**: Should be "+5511999999999"

### 3. Test Default Value Configuration

1. Navigate to `/admin/checkin-settings` to configure welcome screen settings
2. Navigate to `/admin/lead-creation-config` to configure default field values
3. Update the default values for:
   - SOURCE_ID (e.g., change from "CALL" to another value)
   - PARENT_ID_1120 (e.g., change from 4 to another project ID)
   - UF_CRM_1741215746 (e.g., change from 4 to another value)
4. Create another test lead and verify the configured values are used in Bitrix24

### 4. Test Welcome Screen Settings

1. Navigate to `/admin/checkin-settings`
2. Configure the following:
   - **Mensagem de Boas-Vindas**: "Welcome!"
   - **Duração da Exibição**: 10 seconds
   - **Mostrar Responsável**: Enable/Disable
   - **Mostrar ID do Lead**: Enable/Disable
3. Save the configuration
4. Create a new lead via check-in form
5. Verify that the welcome screen appears with:
   - Your custom message
   - Displays for the configured duration (10 seconds)
   - Shows/hides responsible person based on setting
   - Shows/hides lead ID based on setting

## Expected Results

✅ All field codes should be properly mapped to the new Bitrix field codes
✅ Default values should be applied when not overridden by form data
✅ Name and model name fields should always be populated from form input
✅ Welcome screen settings should be configurable and working
✅ Lead creation should succeed without errors

## Troubleshooting

If lead creation fails:

1. Check the browser console for errors
2. Verify the Bitrix24 webhook URL is configured correctly in `/admin/webhooks`
3. Ensure all required fields in Bitrix24 match the field codes in the code
4. Check the database for the `lead_creation_config` table and verify default values
5. Review the Bitrix24 API logs to see if the request was received

## Notes

- The age field code `UF_CRM_1740000000` is a placeholder and should be confirmed with your Bitrix24 administrator
- Custom fields may vary between Bitrix24 instances, so verify field codes match your setup
- The welcome screen configuration is stored in the `check_in_config` table
- Lead creation default values are stored in the `lead_creation_config` table
