class ApiResponse {

    static ok(res, message, data = null){
        return res.status(200).json({
            success: true,
            message,
            data
        })
    }

    static created(res, message, data = null){
        return res.status(201).json({
            success: true,
            message,
            data
        })
    }

    static noContent(res) {
        return res.status(204).send();
    }

    static error(res, message, statusCode = 400, data = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            data,
        });
    }

}



export default ApiResponse