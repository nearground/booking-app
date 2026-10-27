const sendError = (
    res,
    {
        status = 500,
        message = 'Request failed',
        data = {},
        requestId,
    } = {}
) => {
    const payloadData = {
        ...data,
        ...(requestId ? { requestId } : {}),
    };

    return res.status(status).json({
        errors: [message],
        data: payloadData,
    });
};

const defaultExport = { sendError };

export { sendError };
export default defaultExport;
